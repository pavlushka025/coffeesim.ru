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

$users = $pdo->query("SELECT id, username, is_admin, created_at FROM users ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['success' => true, 'users' => $users]);