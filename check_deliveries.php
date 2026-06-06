<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];

$stmt = $pdo->prepare("SELECT game_state FROM game_saves WHERE user_id = ?");
$stmt->execute([$user_id]);
$save = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$save) {
    echo json_encode(['error' => 'Сохранение не найдено']);
    exit;
}

$state = json_decode($save['game_state'], true);
$changed = false;

if (isset($state['orders']) && is_array($state['orders'])) {
    $now = new DateTime();
    foreach ($state['orders'] as &$order) {
        if ($order['status'] === 'pending') {
            $delivery_date = new DateTime($order['delivery_date']);
            if ($delivery_date <= $now) {
                $order['status'] = 'delivered';
                $changed = true;
                
                foreach ($order['items'] as $item) {
                    $ingredient_id = $item['ingredient_id'];
                    $quantity = (float)$item['quantity'];
                    $price = (float)$item['price'];
                    
                    foreach ($state['ingredients'] as &$ing) {
                        if ($ing['id'] === $ingredient_id) {
                            $ing['stock'] += $quantity;
                            if (!isset($ing['batches'])) $ing['batches'] = [];
                            $ing['batches'][] = ['quantity' => $quantity, 'price' => $price];
                            
                            $totalCost = 0;
                            $totalQty = 0;
                            foreach ($ing['batches'] as $batch) {
                                $totalCost += $batch['quantity'] * $batch['price'];
                                $totalQty += $batch['quantity'];
                            }
                            $ing['avgCost'] = $totalQty > 0 ? $totalCost / $totalQty : $ing['currentBuyPrice'];
                            break;
                        }
                    }
                }
                
                $transaction = [
                    'timestamp' => date('Y-m-d H:i:s'),
                    'amount' => 0,
                    'description' => "✅ Доставлен заказ от {$order['supplier_name']}. Товары добавлены на склад.",
                    'category' => 'info'
                ];
                array_unshift($state['transactions'], $transaction);
                array_unshift($state['transactionHistory'], $transaction);
                if (count($state['transactions']) > 500) array_pop($state['transactions']);
                if (count($state['transactionHistory']) > 5000) array_pop($state['transactionHistory']);
            }
        }
    }
}

if ($changed) {
    $json = json_encode($state);
    $updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE user_id = ?");
    $updateStmt->execute([$json, $user_id]);
}

echo json_encode(['success' => true, 'changed' => $changed]);
?>