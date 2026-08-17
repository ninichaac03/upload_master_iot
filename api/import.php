<?php

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/db.php';

$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!is_array($input) || empty($input)) {
    http_response_code(400);

    echo json_encode([
        'error' => 'No records provided'
    ]);

    exit;
}

try {

    // =========================
    // START TRANSACTION
    // =========================
    $pdo->beginTransaction();

    // =========================
    // DELETE OLD DATA
    // =========================
    $deleteSql = "TRUNCATE TABLE `{$TABLE}`";

    $pdo->exec($deleteSql);


    // =========================
    // PREPARE INSERT
    // =========================
    $sql = "
        INSERT INTO `{$TABLE}`
        (
            BRANCH_CODE,
            BRANCH_NAME,
            BOARD_CODE,
            BRAND,
            RECIPE,
            SIM_NUMBER,
            CREATED_AT
        )
        VALUES
        (
            :branch_code,
            :branch_name,
            :board_code,
            :brand,
            :recipe,
            :sim_number,
            NOW()
        )
    ";

    $stmt = $pdo->prepare($sql);

    $ok = 0;


    // =========================
    // INSERT NEW DATA
    // =========================
    foreach ($input as $rec) {

        $branchCode = isset($rec['BRANCH_CODE'])
            ? trim((string) $rec['BRANCH_CODE'])
            : '';

        // ถ้ามี row ที่ไม่มี branch code
        // ให้เกิด error เพื่อ rollback ทั้งหมด
        if ($branchCode === '') {
            throw new Exception(
                'Found a row with no BRANCH_CODE'
            );
        }

        $stmt->execute([

            ':branch_code' => $branchCode,

            ':branch_name' =>
                isset($rec['BRANCH_NAME'])
                ? (string) $rec['BRANCH_NAME']
                : '',

            ':board_code' =>
                isset($rec['BOARD_CODE'])
                ? (string) $rec['BOARD_CODE']
                : '',

            ':brand' =>
                isset($rec['BRAND'])
                ? (int) $rec['BRAND']
                : 0,

            ':recipe' =>
                isset($rec['RECIPE'])
                ? (int) $rec['RECIPE']
                : 0,

            ':sim_number' =>
                isset($rec['SIM_NUMBER'])
                ? (string) $rec['SIM_NUMBER']
                : '',
        ]);

        $ok++;
    }


    // =========================
    // COMMIT
    // =========================
    $pdo->commit();


    echo json_encode([
        'success' => true,
        'ok' => $ok,
        'fail' => 0
    ]);


} catch (Exception $e) {

    // =========================
    // ROLLBACK
    // =========================
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        'error' => $e->getMessage()
    ]);
}