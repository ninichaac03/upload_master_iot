<?php
$DB_HOST = 'localhost';
$DB_NAME = 'iot';
$DB_USER = 'root';
$DB_PASS = '';
$TABLE = 'coffee_sim_iot';

// $DB_HOST = 'database.cpr-one-prd.internal';
// $DB_NAME = 'IOT';
// $DB_USER = 'iotuser';
// $DB_PASS = 'useriot';
// $TABLE = 'useriot';

try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}
