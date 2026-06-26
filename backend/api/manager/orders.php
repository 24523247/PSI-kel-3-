<?php
// ============================================================
// API: GET /backend/api/manager/orders.php
// Daftar pesanan untuk halaman Laporan di panel manajer
// Query params: ?page=1&limit=20&status=paid&search=ORD-
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';

setJsonHeaders();
requireManager();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$db     = getDB();
$page   = max(1, (int)($_GET['page']  ?? 1));
$limit  = max(1, min(100, (int)($_GET['limit'] ?? 20)));
$offset = ($page - 1) * $limit;
$status = trim($_GET['status'] ?? '');
$search = trim($_GET['search'] ?? '');

$where  = [];
$params = [];

if (!empty($status)) {
    $where[]  = 'o.payment_status = ?';
    $params[] = $status;
}
if (!empty($search)) {
    $where[]  = '(o.order_code LIKE ? OR t.table_name LIKE ?)';
    $params[] = "%$search%";
    $params[] = "%$search%";
}

$whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$countStmt = $db->prepare("
    SELECT COUNT(DISTINCT o.id) AS total
    FROM orders o
    JOIN `tables` t ON t.id = o.table_id
    $whereSQL
");
$countStmt->execute($params);
$total = (int)$countStmt->fetch()['total'];

$dataStmt = $db->prepare("
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
    $whereSQL
    GROUP BY o.id, o.order_code, o.total_amount, o.payment_status, o.created_at, t.table_name
    ORDER BY o.created_at DESC
    LIMIT $limit OFFSET $offset
");
$dataStmt->execute($params);
$orders = $dataStmt->fetchAll();

foreach ($orders as &$ord) {
    $ord['id']           = (int)$ord['id'];
    $ord['total_amount'] = (int)$ord['total_amount'];
    $ord['item_count']   = (int)$ord['item_count'];
}

$summaryStmt = $db->query("
    SELECT
        COUNT(*)                                                                             AS total_orders,
        COALESCE(SUM(CASE WHEN payment_status='paid'      THEN total_amount ELSE 0 END), 0) AS total_revenue,
        SUM(CASE WHEN payment_status='paid'      THEN 1 ELSE 0 END)                         AS paid,
        SUM(CASE WHEN payment_status='pending'   THEN 1 ELSE 0 END)                         AS pending,
        SUM(CASE WHEN payment_status='failed'    THEN 1 ELSE 0 END)                         AS failed,
        SUM(CASE WHEN payment_status='cancelled' THEN 1 ELSE 0 END)                         AS cancelled
    FROM orders
");
$summary = $summaryStmt->fetch();
foreach (['total_orders','total_revenue','paid','pending','failed','cancelled'] as $key) {
    $summary[$key] = (int)$summary[$key];
}

jsonResponse([
    'success' => true,
    'data'    => [
        'orders'      => $orders,
        'total'       => $total,
        'page'        => $page,
        'limit'       => $limit,
        'total_pages' => (int)ceil($total / max(1, $limit)),
        'summary'     => $summary,
    ]
]);
