<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

$stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'admin_contacts'");
$stmt->execute();
$row = $stmt->fetch(PDO::FETCH_ASSOC);

$contacts = $row ? $row['setting_value'] : 'Email: admin@coffeesim.ru\nTelegram: @coffeesim_admin';

echo json_encode(['success' => true, 'contacts' => $contacts]);
?>