<?php
// ============================================================
// API: GET /api/order-status.php?code=ORD-20241201-ABC123
// Mengambil status pesanan (digunakan oleh payment-result.html)
// ============================================================

require_once __DIR__ . '/../config.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$orderCode = trim($_GET['code'] ?? '');

if (empty($orderCode)) {
    jsonResponse(['success' => false, 'message' => 'Parameter code wajib diisi'], 400);
}

$db = getDB();

$stmt = $db->prepare('
    SELECT o.id, o.order_code, o.total_amount, o.payment_status, o.created_at,
           t.table_name, t.table_code
    FROM orders o
    JOIN `tables` t ON t.id = o.table_id
    WHERE o.order_code = ?
');
$stmt->execute([$orderCode]);
$order = $stmt->fetch();

if (!$order) {
    jsonResponse(['success' => false, 'message' => 'Pesanan tidak ditemukan'], 404);
}

// Ambil items
$stmt = $db->prepare('
    SELECT p.name, oi.qty, oi.price, oi.subtotal
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
');
$stmt->execute([$order['id']]);
$items = $stmt->fetchAll();

$order['total_amount'] = (int) $order['total_amount'];
foreach ($items as &$item) {
    $item['price']    = (int) $item['price'];
    $item['subtotal'] = (int) $item['subtotal'];
}

jsonResponse([
    'success' => true,
    'data' => [
        'order'  => $order,
        'items'  => $items,
    ]
]);
