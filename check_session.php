<?php
require_once 'db_connect.php';
echo json_encode(['logged_in' => isset($_SESSION['user_id'])]);
?>