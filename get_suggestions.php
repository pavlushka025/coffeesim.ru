<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];

$stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
$isAdmin = ($user && $user['is_admin'] == 1);

$stmt = $pdo->prepare("SELECT * FROM suggestions ORDER BY created_at DESC");
$stmt->execute();
$suggestions = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$isAdmin) {
    foreach ($suggestions as &$s) {
        unset($s['user_id']);
        $s['username'] = 'Игрок';
    }
}

echo json_encode(['success' => true, 'suggestions' => $suggestions, 'is_admin' => $isAdmin]);
?>