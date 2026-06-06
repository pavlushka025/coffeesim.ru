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
    
    $percent = (float)($input['percent'] ?? 0);
    
    if ($percent < 0 || $percent > 100) {
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
    
    $state['amortizationPercent'] = $percent;
    
    $json = json_encode($state);
    
    if ($save) {
        $updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE id = ?");
        $updateStmt->execute([$json, $save['id']]);
    } else {
        $insertStmt = $pdo->prepare("INSERT INTO game_saves (user_id, game_state, last_sync_time) VALUES (?, ?, NOW())");
        $insertStmt->execute([$user_id, $json]);
    }
    
    echo $json;
    
} catch (Exception $e) {
    sendResponse(['error' => $e->getMessage()]);
}
?>