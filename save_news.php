<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

function sendResponse($data) {
    echo json_encode($data);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    sendResponse(['error' => 'Не авторизован']);
}

// Проверка на админа
$stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || $user['is_admin'] != 1) {
    sendResponse(['error' => 'Доступ запрещён. Только для администратора']);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

try {
    if ($action === 'add') {
        $version = trim($input['version'] ?? '');
        $date = trim($input['date'] ?? date('F Y'));
        $description = trim($input['description'] ?? '');
        
        if (empty($version) || empty($description)) {
            sendResponse(['error' => 'Заполните версию и описание']);
        }
        
        $stmt = $pdo->prepare("INSERT INTO news (version, date, description, sort_order) VALUES (?, ?, ?, (SELECT IFNULL(MAX(sort_order), 0) + 1 FROM news n2))");
        $stmt->execute([$version, $date, $description]);
        
        sendResponse(['success' => true, 'message' => 'Новость добавлена']);
        
    } elseif ($action === 'edit') {
        $id = (int)($input['id'] ?? 0);
        $version = trim($input['version'] ?? '');
        $date = trim($input['date'] ?? '');
        $description = trim($input['description'] ?? '');
        
        if ($id <= 0 || empty($version) || empty($description)) {
            sendResponse(['error' => 'Неверные данные']);
        }
        
        $stmt = $pdo->prepare("UPDATE news SET version = ?, date = ?, description = ? WHERE id = ?");
        $stmt->execute([$version, $date, $description, $id]);
        
        sendResponse(['success' => true, 'message' => 'Новость обновлена']);
        
    } elseif ($action === 'delete') {
        $id = (int)($input['id'] ?? 0);
        
        if ($id <= 0) {
            sendResponse(['error' => 'Неверный ID']);
        }
        
        $stmt = $pdo->prepare("DELETE FROM news WHERE id = ?");
        $stmt->execute([$id]);
        
        sendResponse(['success' => true, 'message' => 'Новость удалена']);
        
    } else {
        sendResponse(['error' => 'Неизвестное действие']);
    }
    
} catch (Exception $e) {
    sendResponse(['error' => $e->getMessage()]);
}
?>