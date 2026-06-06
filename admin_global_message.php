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
$message = trim($data['message'] ?? '');

if (!$message) {
    echo json_encode(['error' => 'Сообщение не может быть пустым']);
    exit;
}

// Сохраняем глобальное сообщение в таблицу global_messages (если её нет, создадим)
$pdo->exec("CREATE TABLE IF NOT EXISTS `global_messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `message` TEXT NOT NULL,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

$stmt = $pdo->prepare("INSERT INTO global_messages (message, created_by, created_at) VALUES (?, ?, NOW())");
$stmt->execute([$message, $_SESSION['user_id']]);

// Также можно добавить в лог администратора
$adminLog = [
    'timestamp' => date('Y-m-d H:i:s'),
    'amount' => 0,
    'description' => "📢 Администратор отправил глобальное сообщение: " . substr($message, 0, 100),
    'category' => 'info'
];

// Записываем в свою игру администратора (опционально)
$stmt = $pdo->prepare("SELECT id, game_state FROM game_saves WHERE user_id = ?");
$stmt->execute([$_SESSION['user_id']]);
$save = $stmt->fetch(PDO::FETCH_ASSOC);
if ($save) {
    $state = json_decode($save['game_state'], true);
    array_unshift($state['transactions'], $adminLog);
    array_unshift($state['transactionHistory'], $adminLog);
    if (count($state['transactions']) > 500) array_pop($state['transactions']);
    if (count($state['transactionHistory']) > 5000) array_pop($state['transactionHistory']);
    $stmt2 = $pdo->prepare("UPDATE game_saves SET game_state = ? WHERE id = ?");
    $stmt2->execute([json_encode($state, JSON_UNESCAPED_UNICODE), $save['id']]);
}

echo json_encode(['success' => true, 'message' => 'Сообщение отправлено всем игрокам']);