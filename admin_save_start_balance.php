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
$balance = floatval($data['balance'] ?? 50000);

if ($balance < 1000) {
    echo json_encode(['error' => 'Минимальный баланс 1000 ₽']);
    exit;
}

// Создаём таблицу settings, если её нет
$pdo->exec("CREATE TABLE IF NOT EXISTS `settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL UNIQUE,
    `setting_value` TEXT,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)");

$stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('start_balance', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
$stmt->execute([$balance, $balance]);

echo json_encode(['success' => true, 'message' => "Стартовый баланс изменён на {$balance} ₽"]);