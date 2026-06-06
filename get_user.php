<?php
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$stmt = $pdo->prepare("SELECT username, created_at, is_admin FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) {
    echo json_encode([
        'username' => $user['username'],
        'created_at' => $user['created_at'],
        'is_admin' => $user['is_admin'] == 1
    ]);
} else {
    echo json_encode(['error' => 'Пользователь не найден']);
}
?>