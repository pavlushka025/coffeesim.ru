<?php
session_start();
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$userId = $_SESSION['user_id'];

$stmt = $pdo->prepare("DELETE FROM game_saves WHERE user_id = ?");
$stmt->execute([$userId]);

$stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
if ($stmt->execute([$userId])) {
    session_destroy();
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['error' => 'Ошибка при удалении аккаунта']);
}
?>