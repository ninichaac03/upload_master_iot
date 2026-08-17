<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/db.php';

$search = isset($_GET['q']) ? trim((string)$_GET['q']) : '';

if ($search !== '') {
    $stmt = $pdo->prepare(
        "SELECT * FROM `{$TABLE}`
         WHERE BRANCH_CODE LIKE :q OR BRANCH_NAME LIKE :q OR SIM_NUMBER LIKE :q OR BOARD_CODE LIKE :q
         ORDER BY COFFEE_SIM_ID DESC"
    );
    $stmt->execute([':q' => "%{$search}%"]);
} else {
    $stmt = $pdo->query("SELECT * FROM `{$TABLE}` ORDER BY COFFEE_SIM_ID DESC");
}

echo json_encode($stmt->fetchAll());
