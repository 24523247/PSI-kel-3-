<?php
// ============================================================
// API: GET /api/table.php?code=meja-1
// Mengambil informasi meja berdasarkan kode meja
// ============================================================

require_once __DIR__ . '/../config.php';

setJsonHeaders();

// Hanya boleh request GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

// Ambil parameter ?code=
$code = trim($_GET['code'] ?? '');

$db = getDB();

if (empty($code)) {
    // Tanpa parameter: kembalikan semua meja
    $stmt = $db->query('SELECT id, table_code, table_name FROM `tables` ORDER BY id ASC');
    $tables = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $tables]);
} else {
    // Dengan ?code=xxx: lookup satu meja
    $stmt = $db->prepare('SELECT id, table_code, table_name FROM `tables` WHERE table_code = ?');
    $stmt->execute([$code]);
    $table = $stmt->fetch();

    if (!$table) {
        jsonResponse(['success' => false, 'message' => 'Meja tidak ditemukan'], 404);
    }

    jsonResponse(['success' => true, 'data' => $table]);
}