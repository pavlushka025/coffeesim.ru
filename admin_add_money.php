<?php
session_start();
require_once 'db_connect.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];
$stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$isAdmin = $stmt->fetchColumn();

if (!$isAdmin) {
    echo json_encode(['error' => 'Доступ только администратору']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$targetUsername = trim($data['username'] ?? '');
$amount = floatval($data['amount'] ?? 0);

if (!$targetUsername || $amount <= 0) {
    echo json_encode(['error' => 'Некорректные данные']);
    exit;
}

// Найти игрока
$stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
$stmt->execute([$targetUsername]);
$targetId = $stmt->fetchColumn();

if (!$targetId) {
    echo json_encode(['error' => 'Игрок не найден']);
    exit;
}

// Загрузить игру
$stmt = $pdo->prepare("SELECT id, game_state FROM game_saves WHERE user_id = ?");
$stmt->execute([$targetId]);
$save = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$save) {
    echo json_encode(['error' => 'Игрок не начал игру']);
    exit;
}

$game = json_decode($save['game_state'], true);
$game['balance'] += $amount;

// Добавить транзакцию
$transaction = [
    'timestamp' => date('Y-m-d H:i:s'),
    'amount' => $amount,
    'description' => '🎁 Администратор выдал ' . number_format($amount, 2) . ' ₽',
    'category' => 'income'
];
array_unshift($game['transactions'], $transaction);
array_unshift($game['transactionHistory'], $transaction);
if (count($game['transactions']) > 500) array_pop($game['transactions']);
if (count($game['transactionHistory']) > 5000) array_pop($game['transactionHistory']);

$stmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE id = ?");
$stmt->execute([json_encode($game, JSON_UNESCAPED_UNICODE), $save['id']]);

echo json_encode(['success' => true, 'message' => "Выдано {$amount} ₽ игроку {$targetUsername}"]);