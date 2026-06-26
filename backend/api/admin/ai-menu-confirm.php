<?php
// ============================================================
// API: POST /backend/api/admin/ai-menu-confirm.php
// Eksekusi SQL yang sudah divalidasi dan dikonfirmasi admin.
// AI tidak pernah sampai ke sini — hanya backend yang eksekusi.
// Body: { "log_id": 42, "action": "confirm"|"cancel" }
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/ai-menu-helpers.php';

setJsonHeaders();
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$body   = json_decode(file_get_contents('php://input'), true);
$logId  = (int)($body['log_id'] ?? 0);
$action = trim($body['action'] ?? '');

if (!$logId) {
    jsonResponse(['success' => false, 'message' => 'log_id wajib diisi'], 400);
}
if (!in_array($action, ['confirm', 'cancel'], true)) {
    jsonResponse(['success' => false, 'message' => 'action harus confirm atau cancel'], 400);
}

$db = getDB();

// Ambil log — pastikan milik admin yang login dan masih pending
$stmt = $db->prepare(
    'SELECT * FROM ai_menu_logs WHERE id = ? AND admin_id = ? AND status = ?'
);
$stmt->execute([$logId, $_SESSION['admin_id'], 'pending']);
$log = $stmt->fetch();

if (!$log) {
    jsonResponse(['success' => false, 'message' => 'Log tidak ditemukan atau sudah diproses'], 404);
}

// ── Batalkan ───────────────────────────────────────────────
if ($action === 'cancel') {
    $db->prepare('UPDATE ai_menu_logs SET status = ? WHERE id = ?')
       ->execute(['cancelled', $logId]);
    jsonResponse(['success' => true, 'message' => 'Perintah dibatalkan.', 'action' => 'cancel']);
}

// ── Konfirmasi & Eksekusi ──────────────────────────────────
$sql    = $log['generated_sql'] ?? '';
$params = json_decode($log['params'] ?? '[]', true);

if (empty($sql)) {
    $db->prepare('UPDATE ai_menu_logs SET status=?, result_message=? WHERE id=?')
       ->execute(['failed', 'SQL kosong', $logId]);
    jsonResponse(['success' => false, 'message' => 'SQL kosong pada log ini.'], 400);
}
if (!is_array($params)) {
    $params = [];
}

// Re-validasi SQL sebelum eksekusi (defense in depth)
$validation = validateAISQL($sql);
if ($validation !== true) {
    $db->prepare('UPDATE ai_menu_logs SET status=?, result_message=? WHERE id=?')
       ->execute(['failed', 'Validasi SQL gagal: ' . $validation, $logId]);
    jsonResponse(['success' => false, 'message' => 'Validasi SQL gagal: ' . $validation], 400);
}

// Validasi ulang jumlah placeholder
if (substr_count($sql, '?') !== count($params)) {
    $db->prepare('UPDATE ai_menu_logs SET status=?, result_message=? WHERE id=?')
       ->execute(['failed', 'Mismatch placeholder vs params', $logId]);
    jsonResponse(['success' => false, 'message' => 'Jumlah parameter tidak sesuai SQL.'], 400);
}

// ── Eksekusi dalam transaksi ───────────────────────────────
try {
    $db->beginTransaction();

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $affected = $stmt->rowCount();

    $rows    = null;
    $isRead  = preg_match('/^\s*SELECT\b/i', $sql);

    if ($isRead) {
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            if (isset($r['price']))     $r['price']     = (int)$r['price'];
            if (isset($r['is_active'])) $r['is_active'] = (int)$r['is_active'];
        }
    }

    $db->commit();

    $resultMsg = $isRead
        ? count($rows) . ' baris ditemukan'
        : $affected . ' baris terpengaruh';

    $db->prepare('UPDATE ai_menu_logs SET status=?, result_message=? WHERE id=?')
       ->execute(['executed', $resultMsg, $logId]);

    jsonResponse([
        'success'  => true,
        'message'  => $resultMsg,
        'affected' => $affected,
        'rows'     => $rows,
        'is_read'  => (bool)$isRead,
        'action'   => 'confirm',
    ]);

} catch (Exception $e) {
    $db->rollBack();
    $db->prepare('UPDATE ai_menu_logs SET status=?, result_message=? WHERE id=?')
       ->execute(['failed', $e->getMessage(), $logId]);
    jsonResponse(['success' => false, 'message' => 'Eksekusi gagal: ' . $e->getMessage()], 500);
}
