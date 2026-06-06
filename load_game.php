<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    $stmt = $pdo->prepare("SELECT id, game_state, last_sync_time FROM game_saves WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $save = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($save && !empty($save['game_state'])) {
        $state = json_decode($save['game_state'], true);
        if ($state) {
            // Добавляем username в ответ
            $state['username'] = $_SESSION['username'] ?? '';
            echo json_encode($state);
            exit;
        }
    }
    
    require_once 'default_state.php';
    $state = getDefaultState();
    $state['username'] = $_SESSION['username'] ?? '';
    echo json_encode($state);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>