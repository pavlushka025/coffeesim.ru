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
$id = (int)($input['id'] ?? 0);
$status = $input['status'] ?? '';

$allowed = ['new', 'in_work', 'completed', 'rejected'];
if (!in_array($status, $allowed)) {
    echo json_encode(['error' => 'Неверный статус']);
    exit;
}

$stmt = $pdo->prepare("UPDATE suggestions SET status = ? WHERE id = ?");
$stmt->execute([$status, $id]);

echo json_encode(['success' => true]);
?>