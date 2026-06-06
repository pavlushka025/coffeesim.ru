<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
$referrer_id = (int)($input['referrer_id'] ?? 0);
$bonus = (float)($input['bonus'] ?? 0);
$tax_amount = (float)($input['tax_amount'] ?? 0);

if ($referrer_id <= 0 || $bonus <= 0) {
    echo json_encode(['error' => 'Неверные данные']);
    exit;
}

// Получаем имя приглашённого (текущего пользователя)
$current_user_id = $_SESSION['user_id'] ?? 0;
$stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
$stmt->execute([$current_user_id]);
$current_user = $stmt->fetch(PDO::FETCH_ASSOC);
$referred_username = $current_user['username'] ?? '';

// Обновляем сумму бонуса в таблице referrals
if ($referred_username) {
    $stmt2 = $pdo->prepare("UPDATE referrals SET bonus_earned = bonus_earned + ? WHERE referrer_id = ? AND referred_username = ?");
    $stmt2->execute([$bonus, $referrer_id, $referred_username]);
}

// Получаем сохранение пригласившего
$stmt = $pdo->prepare("SELECT id, game_state FROM game_saves WHERE user_id = ?");
$stmt->execute([$referrer_id]);
$save = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$save) {
    // Если нет сохранения — создаём новое
    require_once 'default_state.php';
    $state = getDefaultState();
    $state['balance'] = $bonus;
    $state['totalIncomeEver'] = $bonus;
    $state['lastSyncTime'] = date('Y-m-d H:i:s');
    $json = json_encode($state);
    $insertStmt = $pdo->prepare("INSERT INTO game_saves (user_id, game_state, last_sync_time) VALUES (?, ?, NOW())");
    $insertStmt->execute([$referrer_id, $json]);
    
    echo json_encode(['success' => true, 'bonus' => $bonus]);
    exit;
}

$state = json_decode($save['game_state'], true);
if (!$state) {
    echo json_encode(['error' => 'Ошибка декодирования состояния']);
    exit;
}

// НАЧИСЛЯЕМ БОНУС НА БАЛАНС
$old_balance = $state['balance'];
$state['balance'] += $bonus;
$state['totalIncomeEver'] += $bonus;

// Добавляем запись в журнал
$transaction = [
    'timestamp' => date('Y-m-d H:i:s'),
    'amount' => $bonus,
    'description' => "🎁 Реферальный бонус: 10% от налога ({$tax_amount} ₽) от приглашённого игрока {$referred_username}",
    'category' => 'income',
    'subcategory' => 'referral',
    'cups' => 0
];
array_unshift($state['transactions'], $transaction);
array_unshift($state['transactionHistory'], $transaction);

// Ограничиваем длину журнала
$state['transactions'] = array_slice($state['transactions'], 0, 500);
$state['transactionHistory'] = array_slice($state['transactionHistory'], 0, 5000);

// Сохраняем обновлённое состояние в game_saves
$json = json_encode($state);
$updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE id = ?");
$updateStmt->execute([$json, $save['id']]);

// Проверяем, что баланс действительно обновился
$checkStmt = $pdo->prepare("SELECT JSON_EXTRACT(game_state, '$.balance') FROM game_saves WHERE id = ?");
$checkStmt->execute([$save['id']]);
$new_balance = $checkStmt->fetchColumn();

echo json_encode([
    'success' => true, 
    'bonus' => $bonus,
    'old_balance' => $old_balance,
    'new_balance' => $new_balance,
    'message' => 'Бонус начислен на баланс'
]);
?>