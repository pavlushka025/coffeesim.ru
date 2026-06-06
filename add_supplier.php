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
    
    $name = trim($input['name'] ?? '');
    $delivery_cost = (float)($input['delivery_cost'] ?? 0);
    $free_delivery_from = (float)($input['free_delivery_from'] ?? 0);
    $delivery_time_min = (int)($input['delivery_time_min'] ?? 30);
    $delivery_time_max = (int)($input['delivery_time_max'] ?? 180);
    
    if (empty($name)) {
        sendResponse(['error' => 'Введите название поставщика']);
    }
    
    // Получаем текущее состояние игры
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
    
    if (!isset($state['suppliers'])) $state['suppliers'] = [];
    
    // Генерируем новый ID поставщика
    $newId = max(array_column($state['suppliers'], 'id') ?: [0]) + 1;
    
    $newSupplier = [
        'id' => $newId,
        'name' => $name,
        'delivery_cost' => $delivery_cost,
        'free_delivery_from' => $free_delivery_from,
        'delivery_time_min' => $delivery_time_min,
        'delivery_time_max' => $delivery_time_max,
        'items' => []
    ];
    
    $state['suppliers'][] = $newSupplier;
    
    $json = json_encode($state, JSON_UNESCAPED_UNICODE);
    
    if ($save) {
        $updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE id = ?");
        $updateStmt->execute([$json, $save['id']]);
    } else {
        $insertStmt = $pdo->prepare("INSERT INTO game_saves (user_id, game_state, last_sync_time) VALUES (?, ?, NOW())");
        $insertStmt->execute([$user_id, $json]);
    }
    
    sendResponse(['success' => true, 'supplier_id' => $newId]);
    
} catch (Exception $e) {
    sendResponse(['error' => $e->getMessage()]);
}
?>