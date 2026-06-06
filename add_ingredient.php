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
    
    $name = $input['name'] ?? '';
    $cost = (float)($input['cost_per_unit'] ?? 0);
    $unit = $input['unit'] ?? 'шт';
    $type = $input['type'] ?? 'ingredient';
    $pack_size = (float)($input['pack_size'] ?? 1);
    $threshold = (float)($input['threshold'] ?? ($type === 'ingredient' ? 1 : 100));
    
    if (empty($name) || $cost <= 0) {
        sendResponse(['error' => 'Неверные данные']);
    }
    
    $stmt = $pdo->prepare("SELECT id, game_state FROM game_saves WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $save = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($save) {
        $state = json_decode($save['game_state'], true);
        if (!$state) $state = [];
    } else {
        require_once 'default_state.php';
        $state = getDefaultState();
    }
    
    $newId = 'ing' . ($state['nextIngId']++);
    $state['ingredients'][] = [
        'id' => $newId,
        'name' => $name,
        'currentBuyPrice' => $cost,
        'unit' => $unit,
        'stock' => 0,
        'type' => $type,
        'alertThreshold' => $threshold,
        'batches' => [],
        'avgCost' => $cost,
        'pack_size' => $pack_size
    ];
    
    $json = json_encode($state, JSON_UNESCAPED_UNICODE);
    
    if ($save) {
        $updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE id = ?");
        $updateStmt->execute([$json, $save['id']]);
    } else {
        $insertStmt = $pdo->prepare("INSERT INTO game_saves (user_id, game_state, last_sync_time) VALUES (?, ?, NOW())");
        $insertStmt->execute([$user_id, $json]);
    }
    
    sendResponse(['success' => true, 'ingredient_id' => $newId, 'state' => $state]);
    
} catch (Exception $e) {
    sendResponse(['error' => $e->getMessage()]);
}
?>