<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];
$input = json_decode(file_get_contents('php://input'), true);

// Поддерживаем оба формата: {state: {...}} и просто {...}
$state = isset($input['state']) ? $input['state'] : $input;

if (!$state) {
    echo json_encode(['error' => 'Нет данных']);
    exit;
}

// Добавляем метку времени
$state['lastSyncTime'] = date('Y-m-d H:i:s');
$json = json_encode($state);

$stmt = $pdo->prepare("SELECT id FROM game_saves WHERE user_id = ?");
$stmt->execute([$user_id]);
$save = $stmt->fetch(PDO::FETCH_ASSOC);

if ($save) {
    $updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE id = ?");
    $updateStmt->execute([$json, $save['id']]);
} else {
    $insertStmt = $pdo->prepare("INSERT INTO game_saves (user_id, game_state, last_sync_time) VALUES (?, ?, NOW())");
    $insertStmt->execute([$user_id, $json]);
}

echo json_encode(['success' => true, 'saved_at' => date('Y-m-d H:i:s')]);
?>