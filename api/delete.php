<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/db.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid id']);
    exit;
}

$stmt = $pdo->prepare("DELETE FROM `{$TABLE}` WHERE COFFEE_SIM_ID = :id");
$stmt->execute([':id' => $id]);

echo json_encode(['deleted' => $stmt->rowCount() > 0]);
