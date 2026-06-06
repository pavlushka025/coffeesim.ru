<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user || $user['is_admin'] != 1) {
    echo json_encode(['error' => 'Доступ запрещён']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$contacts = trim($input['contacts'] ?? '');

$stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('admin_contacts', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
$stmt->execute([$contacts, $contacts]);

echo json_encode(['success' => true]);
?>