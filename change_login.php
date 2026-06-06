<?php
session_start();
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$newLogin = trim($input['new_login'] ?? '');

if (empty($newLogin)) {
    echo json_encode(['error' => 'Логин не может быть пустым']);
    exit;
}

$stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
$stmt->execute([$newLogin, $_SESSION['user_id']]);
if ($stmt->fetch()) {
    echo json_encode(['error' => 'Пользователь с таким логином уже существует']);
    exit;
}

$stmt = $pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
if ($stmt->execute([$newLogin, $_SESSION['user_id']])) {
    $_SESSION['username'] = $newLogin;
    echo json_encode(['success' => true, 'new_login' => $newLogin]);
} else {
    echo json_encode(['error' => 'Ошибка при обновлении логина']);
}
?>