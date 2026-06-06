<?php
header('Content-Type: application/json');

require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];
$input = json_decode(file_get_contents('php://input'), true);
$ingId = $input['ing_id'] ?? '';
$quantity = (float)($input['quantity'] ?? 0);

if (empty($ingId) || $quantity <= 0) {
    echo json_encode(['error' => 'Неверные данные']);
    exit;
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

$ingredientIndex = -1;
for ($i = 0; $i < count($state['ingredients']); $i++) {
    if ($state['ingredients'][$i]['id'] === $ingId) {
        $ingredientIndex = $i;
        break;
    }
}

if ($ingredientIndex === -1) {
    echo json_encode(['error' => 'Ингредиент не найден']);
    exit;
}

$ingredient = &$state['ingredients'][$ingredientIndex];
$cost = $ingredient['currentBuyPrice'] * $quantity;

if ($state['balance'] < $cost) {
    echo json_encode(['error' => 'Недостаточно средств']);
    exit;
}

$state['balance'] -= $cost;
$ingredient['stock'] += $quantity;

if (!isset($ingredient['batches'])) $ingredient['batches'] = [];
$ingredient['batches'][] = ['quantity' => $quantity, 'price' => $ingredient['currentBuyPrice']];

$totalCost = 0;
$totalQty = 0;
foreach ($ingredient['batches'] as $batch) {
    $totalCost += $batch['quantity'] * $batch['price'];
    $totalQty += $batch['quantity'];
}
$ingredient['avgCost'] = $totalQty > 0 ? $totalCost / $totalQty : $ingredient['currentBuyPrice'];

$transaction = [
    'timestamp' => date('Y-m-d H:i:s'),
    'amount' => $cost,
    'description' => 'Закупка ' . $ingredient['name'] . ' x' . $quantity . ' ' . $ingredient['unit'],
    'category' => 'expense',
    'cups' => 0
];
array_unshift($state['transactions'], $transaction);
array_unshift($state['transactionHistory'], $transaction);
$state['transactions'] = array_slice($state['transactions'], 0, 500);
$state['transactionHistory'] = array_slice($state['transactionHistory'], 0, 5000);
$state['totalExpenseEver'] += $cost;

$json = json_encode($state);

if ($save) {
    $updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE id = ?");
    $updateStmt->execute([$json, $save['id']]);
} else {
    $insertStmt = $pdo->prepare("INSERT INTO game_saves (user_id, game_state, last_sync_time) VALUES (?, ?, NOW())");
    $insertStmt->execute([$user_id, $json]);
}

echo $json;
?>