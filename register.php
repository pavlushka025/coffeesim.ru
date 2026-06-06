<?php
header('Content-Type: application/json');
require_once 'db_connect.php';
require_once 'default_state.php';  // ← подключаем твой файл

$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    die(json_encode(['error' => 'Заполните все поля']));
}

$stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
$stmt->execute([$username]);
if ($stmt->fetch()) {
    die(json_encode(['error' => 'Пользователь уже существует']));
}

$ref = trim($_GET['ref'] ?? '');
$referrer_id = null;

if (!empty($ref)) {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$ref]);
    $referrer = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($referrer) {
        $referrer_id = $referrer['id'];
    }
}

$password_hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT INTO users (username, password_hash, created_at, referrer_id) VALUES (?, ?, NOW(), ?)");
$stmt->execute([$username, $password_hash, $referrer_id]);

$new_user_id = $pdo->lastInsertId();

if ($referrer_id) {
    try {
        $stmt2 = $pdo->prepare("INSERT INTO referrals (referrer_id, referred_username, referred_user_id, created_at) VALUES (?, ?, ?, NOW())");
        $stmt2->execute([$referrer_id, $username, $new_user_id]);
    } catch (Exception $e) {}
}

// ===== ВОТ ГЛАВНОЕ: создаём состояние из твоего default_state.php =====
$state = getDefaultState();

// Если есть реферер — выдаём бесплатный первый автомат
if ($referrer_id && !empty($state['realMachines'])) {
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
    $state['transactions'][] = [
        'timestamp' => date('Y-m-d H:i:s'),
        'amount' => 0,
        'description' => '🎁 Вы получили бесплатный автомат "' . $freeMachine['name'] . '" по реферальной ссылке!',
        'category' => 'info'
    ];
}

$json = json_encode($state, JSON_UNESCAPED_UNICODE);
$insertStmt = $pdo->prepare("INSERT INTO game_saves (user_id, game_state, last_sync_time) VALUES (?, ?, NOW())");
$insertStmt->execute([$new_user_id, $json]);

echo json_encode(['success' => true]);
?>