<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Получаем непрочитанные уведомления
$stmt = $pdo->prepare("SELECT id, data FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY id ASC");
$stmt->execute([$user_id]);
$notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['success' => true, 'notifications' => $notifications]);
?>