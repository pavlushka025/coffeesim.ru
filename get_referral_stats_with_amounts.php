<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Получаем список приглашённых С ИХ БОНУСАМИ из таблицы referrals
$stmt = $pdo->prepare("
    SELECT 
        referred_username,
        created_at,
        COALESCE(bonus_earned, 0) as bonus_earned
    FROM referrals
    WHERE referrer_id = ?
    ORDER BY created_at DESC
");
$stmt->execute([$user_id]);
$referrals = $stmt->fetchAll(PDO::FETCH_ASSOC);

$count = count($referrals);

$total_bonus = 0;
foreach ($referrals as $ref) {
    $total_bonus += $ref['bonus_earned'];
}

echo json_encode([
    'success' => true,
    'count' => $count,
    'total_bonus' => (float)$total_bonus,
    'referrals' => $referrals
]);
?>