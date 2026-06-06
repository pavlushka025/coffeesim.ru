<?php
session_start();
require_once 'db_connect.php';
require_once 'default_state.php';
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
$newBalance = floatval($data['balance'] ?? 50000);

if (!$targetUsername || $newBalance < 0) {
    echo json_encode(['error' => 'Некорректные данные']);
    exit;
}

// Найти игрока
$stmt = $pdo->prepare("SELECT id, referrer_id FROM users WHERE username = ?");
$stmt->execute([$targetUsername]);
$target = $stmt->fetch(PDO::FETCH_ASSOC);
$targetId = $target['id'] ?? null;
$hasReferrer = !empty($target['referrer_id']);

if (!$targetId) {
    echo json_encode(['error' => 'Игрок не найден']);
    exit;
}

// Новая игра из default_state
$defaultGame = getDefaultState();
$defaultGame['balance'] = $newBalance;
$defaultGame['lastSyncTime'] = date('Y-m-d H:i:s');
$defaultGame['transactions'] = [];
$defaultGame['transactionHistory'] = [];
$defaultGame['totalIncomeEver'] = 0;
$defaultGame['totalExpenseEver'] = 0;
$defaultGame['totalCupsSold'] = 0;
$defaultGame['machines'] = [];
$defaultGame['machineCounter'] = 1;

// Если игрок пришёл по реферальной ссылке — НЕ ДАЁМ бесплатный автомат повторно
if (!$hasReferrer) {
    // Можно оставить пустым — автомат не выдаём
}

foreach ($defaultGame['ingredients'] as &$ing) {
    $ing['stock'] = 0;
    $ing['batches'] = [];
    $ing['avgCost'] = $ing['currentBuyPrice'];
}

$json = json_encode($defaultGame, JSON_UNESCAPED_UNICODE);

$stmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE user_id = ?");
$stmt->execute([$json, $targetId]);

echo json_encode(['success' => true, 'message' => "Игра сброшена для {$targetUsername} с балансом {$newBalance} ₽"]);
