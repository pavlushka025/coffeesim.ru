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
    
    $supplier_id = (int)($input['supplier_id'] ?? 0);
    $ingredient_id = $input['ingredient_id'] ?? '';
    $price = (float)($input['price'] ?? 0);
    $unit = $input['unit'] ?? 'шт';
    $pack_size = (float)($input['pack_size'] ?? 1);
    $min_quantity = (int)($input['min_quantity'] ?? 1);
    
    if (!$supplier_id || empty($ingredient_id) || $price <= 0) {
        sendResponse(['error' => 'Неверные данные']);
    }
    
    // Получаем текущее состояние игры
    $stmt = $pdo->prepare("SELECT id, game_state FROM game_saves WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $save = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$save) {
        sendResponse(['error' => 'Сохранение не найдено']);
    }
    
    $state = json_decode($save['game_state'], true);
    if (!$state) $state = [];
    
    // Находим поставщика и добавляем товар
    $supplierFound = false;
    foreach ($state['suppliers'] as &$supplier) {
        if ($supplier['id'] == $supplier_id) {
            $supplierFound = true;
            // Проверяем, нет ли уже такого товара
            $exists = false;
            foreach ($supplier['items'] as &$item) {
                if ($item['ingredient_id'] === $ingredient_id) {
                    $exists = true;
                    $item['price'] = $price;
                    $item['unit'] = $unit;
                    $item['pack_size'] = $pack_size;
                    $item['min_quantity'] = $min_quantity;
                    break;
                }
            }
            if (!$exists) {
                $supplier['items'][] = [
                    'ingredient_id' => $ingredient_id,
                    'price' => $price,
                    'unit' => $unit,
                    'pack_size' => $pack_size,
                    'min_quantity' => $min_quantity
                ];
            }
            break;
        }
    }
    
    if (!$supplierFound) {
        sendResponse(['error' => 'Поставщик не найден']);
    }
    
    $json = json_encode($state, JSON_UNESCAPED_UNICODE);
    
    $updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE id = ?");
    $updateStmt->execute([$json, $save['id']]);
    
    sendResponse(['success' => true]);
    
} catch (Exception $e) {
    sendResponse(['error' => $e->getMessage()]);
}
?>