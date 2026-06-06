<?php
header('Content-Type: application/json');

require_once 'db_connect.php';
require_once 'default_state.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Читаем сумму из запроса
$input = json_decode(file_get_contents('php://input'), true);
$startBalance = isset($input['start_balance']) ? (float)$input['start_balance'] : 10000;

// Загружаем текущее состояние, чтобы проверить, был ли бесплатный автомат
$stmt = $pdo->prepare("SELECT game_state FROM game_saves WHERE user_id = ?");
$stmt->execute([$user_id]);
$currentSave = $stmt->fetch(PDO::FETCH_ASSOC);
$hadFreeMachine = false;

if ($currentSave) {
    $currentState = json_decode($currentSave['game_state'], true);
    if ($currentState && isset($currentState['machines'])) {
        foreach ($currentState['machines'] as $machine) {
            if ($machine['buyPrice'] == 0 && $machine['name'] == 'Jetinno JL 300') {
                $hadFreeMachine = true;
                break;
            }
        }
    }
}

$state = getDefaultState();
$state['balance'] = $startBalance;
$state['lastSyncTime'] = date('Y-m-d H:i:s');

$state['transactions'] = [];
$state['transactionHistory'] = [];
$state['totalIncomeEver'] = 0;
$state['totalExpenseEver'] = 0;
$state['totalCupsSold'] = 0;
$state['ad_campaign'] = null;
$state['loans'] = [];
$state['nextIngId'] = 100;
$state['nextDrinkId'] = 100;

// Если у игрока был бесплатный автомат — восстанавливаем его
if ($hadFreeMachine) {
    $freeMachine = $state['realMachines'][0];
    $state['machines'] = [[
        'id' => 1,
        'name' => $freeMachine['name'],
        'buyPrice' => 0,
        'rent' => $freeMachine['rent'],
        'acquirerPercent' => $freeMachine['acquirerPercent'],
        'maintenanceCost' => $freeMachine['maintenanceCost'],
        'serviceCost' => $freeMachine['serviceCost'],
        'powerKwh' => $freeMachine['powerKwh'],
        'totalSales' => 0,
        'totalIncome' => 0,
        'totalExpense' => 0
    ]];
    $state['machineCounter'] = 2;
    
    // Добавляем запись в журнал
    $state['transactions'][] = [
        'timestamp' => date('Y-m-d H:i:s'),
        'amount' => 0,
        'description' => '🎁 Бесплатный автомат "' . $freeMachine['name'] . '" восстановлен после сброса игры',
        'category' => 'info'
    ];
    $state['transactionHistory'][] = [
        'timestamp' => date('Y-m-d H:i:s'),
        'amount' => 0,
        'description' => '🎁 Бесплатный автомат "' . $freeMachine['name'] . '" восстановлен после сброса игры',
        'category' => 'info'
    ];
} else {
    $state['machines'] = [];
    $state['machineCounter'] = 1;
}

for ($i = 0; $i < count($state['ingredients']); $i++) {
    $state['ingredients'][$i]['stock'] = 0;
    $state['ingredients'][$i]['batches'] = [];
    $state['ingredients'][$i]['avgCost'] = $state['ingredients'][$i]['currentBuyPrice'];
}

$json = json_encode($state);

$stmt = $pdo->prepare("SELECT id FROM game_saves WHERE user_id = ?");
$stmt->execute([$user_id]);
$save = $stmt->fetch(PDO::FETCH_ASSOC);

if ($save) {
    $updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE user_id = ?");
    $updateStmt->execute([$json, $user_id]);
} else {
    $insertStmt = $pdo->prepare("INSERT INTO game_saves (user_id, game_state, last_sync_time) VALUES (?, ?, NOW())");
    $insertStmt->execute([$user_id, $json]);
}

echo $json;
?>
