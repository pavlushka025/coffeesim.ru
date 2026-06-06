<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
    
    // Получаем текущее сохранение
    $stmt = $pdo->prepare("SELECT id, game_state, last_sync_time FROM game_saves WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $save = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$save) {
        require_once 'default_state.php';
        $state = getDefaultState();
        $state['lastSyncTime'] = date('Y-m-d H:i:s');
    } else {
        $state = json_decode($save['game_state'], true);
        if (!$state) {
            require_once 'default_state.php';
            $state = getDefaultState();
        }
    }
    
    // Обновляем рекламный множитель
    if (!empty($state['ad_campaign']) && $state['ad_campaign']['active']) {
        $start = new DateTime($state['ad_campaign']['start_date']);
        $now = new DateTime();
        $days_passed = $start->diff($now)->days;
        $total_days = $state['ad_campaign']['duration_days'];
        $start_factor = $state['ad_campaign']['start_factor'];
        if ($days_passed >= $total_days) {
            $state['ad_campaign']['active'] = false;
            $state['ad_campaign']['current_factor'] = 1.0;
        } else {
            $progress = $days_passed / $total_days;
            $state['ad_campaign']['current_factor'] = max(1.0, $start_factor - $progress * ($start_factor - 1.0));
        }
    }
    
    // Инициализация отсутствующих полей
    if (!isset($state['ingredients'])) $state['ingredients'] = [];
    if (!isset($state['drinks'])) $state['drinks'] = [];
    if (!isset($state['machines'])) $state['machines'] = [];
    if (!isset($state['transactions'])) $state['transactions'] = [];
    if (!isset($state['transactionHistory'])) $state['transactionHistory'] = [];
    if (!isset($state['balance'])) {
        require_once 'default_state.php';
        $default = getDefaultState();
        $state['balance'] = $default['balance'];
    }
    if (!isset($state['totalIncomeEver'])) $state['totalIncomeEver'] = 0;
    if (!isset($state['totalExpenseEver'])) $state['totalExpenseEver'] = 0;
    if (!isset($state['totalCupsSold'])) $state['totalCupsSold'] = 0;
    if (!isset($state['taxPercent'])) $state['taxPercent'] = 6;
    if (!isset($state['maintenancePerMachine'])) $state['maintenancePerMachine'] = 1000;
    if (!isset($state['amortizationPercent'])) $state['amortizationPercent'] = 2;
    if (!isset($state['loans'])) $state['loans'] = [];
    if (!isset($state['nextIngId'])) $state['nextIngId'] = 100;
    if (!isset($state['nextDrinkId'])) $state['nextDrinkId'] = 100;
    if (!isset($state['machineCounter'])) $state['machineCounter'] = 1;
    
    $state['lastSyncTime'] = date('Y-m-d H:i:s');
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