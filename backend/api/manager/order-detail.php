<?php
// ============================================================
// API: GET /backend/api/manager/order-detail.php?code=ORD-xxx
// Detail satu pesanan beserta items — untuk modal laporan manajer
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';

setJsonHeaders();
requireManager();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$code = trim($_GET['code'] ?? '');
if (!$code) {
    jsonResponse(['success' => false, 'message' => 'Parameter code wajib diisi'], 400);
}

$db = getDB();

$stmt = $db->prepare("
    SELECT o.id, o.order_code, o.total_amount, o.payment_status, o.created_at,
           t.table_name, t.table_code
    FROM orders o
    JOIN `tables` t ON t.id = o.table_id
    WHERE o.order_code = ?
");
$stmt->execute([$code]);
$order = $stmt->fetch();

if (!$order) {
    jsonResponse(['success' => false, 'message' => 'Pesanan tidak ditemukan'], 404);
}

$order['id']           = (int)$order['id'];
$order['total_amount'] = (int)$order['total_amount'];

$stmt = $db->prepare("
    SELECT p.name, p.image_url, oi.qty, oi.price, oi.subtotal
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
    ORDER BY oi.id ASC
");
$stmt->execute([$order['id']]);
$items = $stmt->fetchAll();

foreach ($items as &$item) {
    $item['qty']      = (int)$item['qty'];
    $item['price']    = (int)$item['price'];
    $item['subtotal'] = (int)$item['subtotal'];
}

jsonResponse([
    'success' => true,
    'data'    => [
        'order' => $order,
        'items' => $items,
    ]
]);
