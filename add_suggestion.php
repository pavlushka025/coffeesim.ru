<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$message = trim($input['message'] ?? '');

if (empty($message)) {
    echo json_encode(['error' => 'Текст предложения не может быть пустым']);
    exit;
}

$user_id = $_SESSION['user_id'];

$stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
$username = $user ? $user['username'] : 'Аноним';

$stmt = $pdo->prepare("INSERT INTO suggestions (user_id, username, message, status) VALUES (?, ?, ?, 'new')");
$stmt->execute([$user_id, $username, $message]);

echo json_encode(['success' => true, 'message' => 'Предложение отправлено. Спасибо!']);
?>