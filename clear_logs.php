<?php
header('Content-Type: application/json');

require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];

$stmt = $pdo->prepare("SELECT id, game_state FROM game_saves WHERE user_id = ?");
$stmt->execute([$user_id]);
$save = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$save) {
    require_once 'default_state.php';
    $state = getDefaultState();
} else {
    $state = json_decode($save['game_state'], true);
    if (!$state) $state = [];
}

$state['transactions'] = [];

$json = json_encode($state);
$updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE id = ?");
$updateStmt->execute([$json, $save['id']]);

echo $json;
?>