<?php
header('Content-Type: application/json');
error_reporting(0);
ini_set('display_errors', 0);

require_once 'db_connect.php';

$isAdmin = false;
if (isset($_SESSION['user_id'])) {
    $stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    $isAdmin = ($user && isset($user['is_admin']) && $user['is_admin'] == 1);
}

try {
    // СОРТИРОВКА: свежие новости сверху (sort_order DESC)
    $stmt = $pdo->prepare("SELECT * FROM news ORDER BY sort_order DESC, id DESC");
    $stmt->execute();
    $news = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($news)) {
        $news = [
            ['id' => 1, 'version' => 'v1.0.0 — Первый прототип', 'date' => '28 апреля 2026', 'description' => 'Базовый кофе-бизнес симулятор', 'sort_order' => 1],
            ['id' => 2, 'version' => 'v1.1.0 — Серверное сохранение', 'date' => '2 мая 2026', 'description' => 'Добавлены автоматы, FIFO', 'sort_order' => 2],
            ['id' => 3, 'version' => 'v1.9.2 — Реферальная система', 'date' => '27 мая 2026', 'description' => 'Приглашай друзей и получай 10% от их налогов', 'sort_order' => 12]
        ];
    }
    
    echo json_encode(['success' => true, 'news' => $news, 'is_admin' => $isAdmin]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>