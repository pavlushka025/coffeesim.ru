<?php
session_start();
require_once 'db_connect.php';
require_once 'default_state.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];
$stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$isAdmin = $stmt->fetchColumn();

if (!$isAdmin) {
    echo json_encode(['error' => 'Доступ только администратору']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$targetUsername = trim($data['username'] ?? '');
$newBalance = floatval($data['balance'] ?? 50000);

if (!$targetUsername || $newBalance < 0) {
    echo json_encode(['error' => 'Некорректные данные']);
    exit;
}

// Найти игрока
$stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
$stmt->execute([$targetUsername]);
$targetId = $stmt->fetchColumn();

if (!$targetId) {
    echo json_encode(['error' => 'Игрок не найден']);
    exit;
}

// Проверяем, был ли у игрока бесплатный автомат
$stmt = $pdo->prepare("SELECT game_state FROM game_saves WHERE user_id = ?");
$stmt->execute([$targetId]);
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

$defaultGame = getDefaultState();
$defaultGame['balance'] = $newBalance;
$defaultGame['lastSyncTime'] = date('Y-m-d H:i:s');
$defaultGame['transactions'] = [];
$defaultGame['transactionHistory'] = [];
$defaultGame['totalIncomeEver'] = 0;
$defaultGame['totalExpenseEver'] = 0;
$defaultGame['totalCupsSold'] = 0;

// Если был бесплатный автомат — восстанавливаем
if ($hadFreeMachine) {
    $freeMachine = $defaultGame['realMachines'][0];
    $defaultGame['machines'] = [[
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
    $defaultGame['machineCounter'] = 2;
    
    $defaultGame['transactions'][] = [
        'timestamp' => date('Y-m-d H:i:s'),
        'amount' => 0,
        'description' => '🎁 Бесплатный автомат "' . $freeMachine['name'] . '" восстановлен после сброса игры администратором',
        'category' => 'info'
    ];
    $defaultGame['transactionHistory'][] = [
        'timestamp' => date('Y-m-d H:i:s'),
        'amount' => 0,
        'description' => '🎁 Бесплатный автомат "' . $freeMachine['name'] . '" восстановлен после сброса игры администратором',
        'category' => 'info'
    ];
} else {
    $defaultGame['machines'] = [];
    $defaultGame['machineCounter'] = 1;
}

foreach ($defaultGame['ingredients'] as &$ing) {
    $ing['stock'] = 0;
    $ing['batches'] = [];
    $ing['avgCost'] = $ing['currentBuyPrice'];
}

$json = json_encode($defaultGame, JSON_UNESCAPED_UNICODE);

$stmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE user_id = ?");
$stmt->execute([$json, $targetId]);

echo json_encode(['success' => true, 'message' => "Игра сброшена для {$targetUsername} с балансом {$newBalance} ₽"]);
?>
