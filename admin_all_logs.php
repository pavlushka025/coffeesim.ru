<?php
session_start();
require_once 'db_connect.php';
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

$logs = $pdo->query("
    SELECT u.username, ug.game_state, ug.last_sync_time 
    FROM game_saves ug 
    JOIN users u ON ug.user_id = u.id 
    ORDER BY ug.last_sync_time DESC
")->fetchAll(PDO::FETCH_ASSOC);

$result = [];
foreach ($logs as $log) {
    $game = json_decode($log['game_state'], true);
    $lastTransactions = array_slice($game['transactions'] ?? [], 0, 10);
    $result[] = [
        'username' => $log['username'],
        'updated_at' => $log['last_sync_time'],
        'balance' => $game['balance'] ?? 0,
        'total_cups' => $game['totalCupsSold'] ?? 0,
        'last_transactions' => $lastTransactions
    ];
}

echo json_encode(['success' => true, 'logs' => $result]);