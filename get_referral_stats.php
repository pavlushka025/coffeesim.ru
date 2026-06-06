<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Получаем список приглашённых
$stmt = $pdo->prepare("
    SELECT 
        referred_username,
        created_at as invited_date,
        COALESCE(bonus_earned, 0) as bonus_earned
    FROM referrals
    WHERE referrer_id = ?
    ORDER BY created_at DESC
");
$stmt->execute([$user_id]);
$referrals = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Общая сумма бонусов
$totalStmt = $pdo->prepare("SELECT COALESCE(SUM(bonus_earned), 0) as total FROM referrals WHERE referrer_id = ?");
$totalStmt->execute([$user_id]);
$total = $totalStmt->fetch(PDO::FETCH_ASSOC)['total'];

echo json_encode([
    'success' => true,
    'referrals' => $referrals,
    'total_bonus' => $total,
    'count' => count($referrals)
]);
?>