<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];

$stmt = $pdo->prepare("SELECT game_state FROM game_saves WHERE user_id = ?");
$stmt->execute([$user_id]);
$save = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$save) {
    echo json_encode(['error' => 'Сохранение не найдено']);
    exit;
}

$state = json_decode($save['game_state'], true);
echo json_encode($state['suppliers'] ?? []);
?>