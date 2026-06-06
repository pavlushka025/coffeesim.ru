<?php
session_start();
require_once 'db_connect.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$supplier_id = $data['supplier_id'];
$items = $data['items'];
$delivery_cost = $data['delivery_cost'];
$total_cost = $data['total_cost'];

$user_id = $_SESSION['user_id'];

// Получаем текущее состояние игры
$stmt = $pdo->prepare("SELECT game_state FROM game_saves WHERE user_id = ?");
$stmt->execute([$user_id]);
$save = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$save) {
    echo json_encode(['error' => 'Сохранение не найдено']);
    exit;
}

$state = json_decode($save['game_state'], true);

// Находим поставщика
$supplier = null;
foreach ($state['suppliers'] as $s) {
    if ($s['id'] == $supplier_id) {
        $supplier = $s;
        break;
    }
}

if (!$supplier) {
    echo json_encode(['error' => 'Поставщик не найден']);
    exit;
}

// Проверяем баланс
if ($state['balance'] < $total_cost) {
    echo json_encode(['error' => 'Недостаточно средств']);
    exit;
}

// Списываем деньги
$state['balance'] -= $total_cost;
$state['totalExpenseEver'] += $total_cost;

// Составляем описание заказа
$itemsList = [];
foreach ($items as $item) {
    $itemsList[] = $item['name'] . ' x' . $item['packs'] . ' упак. (' . $item['quantity'] . ' ' . $item['unit'] . ')';
}
$itemsStr = implode(', ', $itemsList);

// Добавляем запись о заказе в транзакции
$transaction = [
    'timestamp' => date('Y-m-d H:i:s'),
    'amount' => $total_cost,
    'description' => '📦 Заказ у поставщика: ' . $itemsStr . ' (доставка ' . number_format($delivery_cost, 2) . ' ₽)',
    'category' => 'expense',
    'subcategory' => 'order'
];

array_unshift($state['transactions'], $transaction);
array_unshift($state['transactionHistory'], $transaction);

// Ограничиваем размер массивов
if (count($state['transactions']) > 500) array_pop($state['transactions']);
if (count($state['transactionHistory']) > 5000) array_pop($state['transactionHistory']);

// Добавляем заказ в массив orders с delivery_date
if (!isset($state['orders'])) $state['orders'] = [];

// Рассчитываем время доставки (в минутах)
$deliveryMinutes = rand($supplier['delivery_time_min'], $supplier['delivery_time_max']);
$deliveryDate = date('Y-m-d H:i:s', strtotime("+{$deliveryMinutes} minutes"));

// ========== ДОБАВЛЯЕМ ДЕТАЛИ ТОВАРОВ ДЛЯ ЖУРНАЛА ==========
$itemsDetails = [];
foreach ($items as $item) {
    $itemsDetails[] = $item['name'] . ': ' . $item['quantity'] . ' ' . $item['unit'] . ' (' . number_format($item['quantity'] * $item['price'], 2) . ' ₽)';
}

$order = [
    'id' => time() . rand(100, 999),
    'supplier_id' => $supplier_id,
    'supplier_name' => $supplier['name'],
    'items' => $items,
    'items_details' => $itemsDetails,  // ← ДОБАВЛЕНО
    'delivery_cost' => $delivery_cost,
    'total_cost' => $total_cost,
    'status' => 'pending',
    'created_at' => date('Y-m-d H:i:s'),
    'delivery_date' => $deliveryDate,
    'delivery_time_min' => $supplier['delivery_time_min'],
    'delivery_time_max' => $supplier['delivery_time_max']
];

$state['orders'][] = $order;

// Сохраняем
$updatedState = json_encode($state, JSON_UNESCAPED_UNICODE);
$updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ? WHERE user_id = ?");
$updateStmt->execute([$updatedState, $user_id]);

// Возвращаем сообщение с информацией о времени доставки
$deliveryHours = floor($deliveryMinutes / 60);
$deliveryMins = $deliveryMinutes % 60;
$timeText = '';
if ($deliveryHours > 0) {
    $timeText = "{$deliveryHours} ч {$deliveryMins} мин";
} else {
    $timeText = "{$deliveryMins} мин";
}

echo json_encode([
    'success' => true, 
    'message' => "Заказ оформлен! Доставка в течение {$timeText}. Товары будут добавлены на склад автоматически."
]);
?>