<?php
session_start();
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$newPass = $input['new_password'] ?? '';
$confirm = $input['confirm_password'] ?? '';

if (empty($newPass) || strlen($newPass) < 4) {
    echo json_encode(['error' => 'Пароль должен быть не менее 4 символов']);
    exit;
}
if ($newPass !== $confirm) {
    echo json_encode(['error' => 'Пароли не совпадают']);
    exit;
}

$hash = password_hash($newPass, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
if ($stmt->execute([$hash, $_SESSION['user_id']])) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['error' => 'Ошибка при обновлении пароля']);
}
?>