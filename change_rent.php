<?php
header('Content-Type: application/json');
error_reporting(0);
ini_set('display_errors', 0);

function sendResponse($data) {
    echo json_encode($data);
    exit;
}

try {
    require_once 'db_connect.php';
    
    if (!isset($_SESSION['user_id'])) {
        sendResponse(['error' => 'Не авторизован']);
    }
    
    $user_id = $_SESSION['user_id'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    $machineId = (int)($input['machine_id'] ?? 0);
    $newRent = (float)($input['rent'] ?? 0);
    
    if ($machineId <= 0 || $newRent < 0) {
        sendResponse(['error' => 'Неверные данные']);
    }
    
    $stmt = $pdo->prepare("SELECT id, game_state FROM game_saves WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $save = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($save) {
        $state = json_decode($save['game_state'], true);
        if (!$state) $state = [];
    } else {
        sendResponse(['error' => 'Сохранение не найдено']);
    }
    
    for ($i = 0; $i < count($state['machines']); $i++) {
        if ($state['machines'][$i]['id'] === $machineId) {
            $state['machines'][$i]['rent'] = $newRent;
            break;
        }
    }
    
    $json = json_encode($state);
    $updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE id = ?");
    $updateStmt->execute([$json, $save['id']]);
    
    echo $json;
    
} catch (Exception $e) {
    sendResponse(['error' => $e->getMessage()]);
}
?>