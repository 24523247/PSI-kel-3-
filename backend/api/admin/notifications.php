<?php
// ============================================================
// API: /backend/api/admin/notifications.php
// GET   → daftar orders dengan is_notified = 1
// PATCH → dismiss notifikasi (set is_notified = 0)
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';

setJsonHeaders();
requireAdmin();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET: ambil semua notifikasi aktif ────────────────────────
if ($method === 'GET') {
    $stmt = $db->query("
        SELECT
            o.id,
            o.order_code,
            o.total_amount,
            o.payment_status,
            o.created_at,
            t.table_name,
            COUNT(oi.id) AS item_count
        FROM orders o
        JOIN `tables` t ON t.id = o.table_id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.is_notified = 1
        GROUP BY o.id, o.order_code, o.total_amount, o.payment_status, o.created_at, t.table_name
        ORDER BY o.created_at DESC
    ");
    $notifications = $stmt->fetchAll();

    foreach ($notifications as &$n) {
        $n['id']           = (int)$n['id'];
        $n['total_amount'] = (int)$n['total_amount'];
        $n['item_count']   = (int)$n['item_count'];
    }

    jsonResponse(['success' => true, 'data' => $notifications]);
}

// ── PATCH: dismiss notifikasi ────────────────────────────────
if ($method === 'PATCH') {
    $body = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($body['id'] ?? 0);

    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'id wajib diisi'], 400);
    }

    $stmt = $db->prepare('UPDATE orders SET is_notified = 0 WHERE id = ? AND is_notified = 1');
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['success' => false, 'message' => 'Notifikasi tidak ditemukan'], 404);
    }

    jsonResponse(['success' => true, 'message' => 'Notifikasi ditandai selesai']);
}

jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
