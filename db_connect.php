<?php
$config = require __DIR__ . '/config.php';
$db = $config['db'];

try {
    $pdo = new PDO(
        "mysql:host={$db['host']};dbname={$db['dbname']};charset=utf8mb4",
        $db['user'],
        $db['pass']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(['error' => 'Ошибка подключения к базе данных: ' . $e->getMessage()]));
}
session_start();
?>