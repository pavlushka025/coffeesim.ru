<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

// Проверка на админа
$stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !isset($user['is_admin']) || $user['is_admin'] != 1) {
    echo json_encode(['error' => 'Доступ запрещён']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$order = $input['order'] ?? [];

try {
    foreach ($order as $index => $id) {
        $stmt = $pdo->prepare("UPDATE news SET sort_order = ? WHERE id = ?");
        $stmt->execute([$index, $id]);
    }
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>