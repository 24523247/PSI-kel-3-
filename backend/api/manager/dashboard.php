<?php
// ============================================================
// API: GET /backend/api/manager/dashboard.php
// Data lengkap untuk dashboard manajer: KPI, tren, analitik
// Query param:
//   ?days=7|30|90        (default 30, max 365)
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD  (custom range, max 365 hari)
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';

setJsonHeaders();
requireManager();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$db    = getDB();
$today = date('Y-m-d');

// ── Parse date range ──────────────────────────────────────────
if (!empty($_GET['from']) && !empty($_GET['to'])) {
    $dateFrom = $_GET['from'];
    $dateTo   = $_GET['to'];
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
        jsonResponse(['success' => false, 'message' => 'Format tanggal tidak valid (YYYY-MM-DD)'], 400);
    }
    if ($dateFrom > $dateTo) [$dateFrom, $dateTo] = [$dateTo, $dateFrom];
    if ($dateTo > $today)    $dateTo = $today;
    $days     = min(365, (int)(new DateTime($dateFrom))->diff(new DateTime($dateTo))->days + 1);
    $isCustom = true;
} else {
    $days     = min(365, max(1, (int)($_GET['days'] ?? 30)));
    $dateTo   = $today;
    $dateFrom = date('Y-m-d', strtotime('-' . ($days - 1) . ' days'));
    $isCustom = false;
}

// Periode sebelumnya untuk perbandingan growth
$prevDateTo   = date('Y-m-d', strtotime($dateFrom . ' -1 day'));
$prevDateFrom = date('Y-m-d', strtotime($prevDateTo . ' -' . ($days - 1) . ' days'));

// ── Deteksi kolom opsional ────────────────────────────────────
$hasCostColumn   = false;
$hasOiCostColumn = false;
try { $db->query("SELECT cost_price FROM products    LIMIT 0"); $hasCostColumn   = true; } catch (PDOException $e) {}
try { $db->query("SELECT cost_price FROM order_items LIMIT 0"); $hasOiCostColumn = true; } catch (PDOException $e) {}

$hasCostData = false;
if ($hasCostColumn) {
    $hasCostData = (bool)(int)$db->query(
        "SELECT COUNT(*) FROM products WHERE cost_price > 0"
    )->fetchColumn();
}

if ($hasOiCostColumn) {
    $profitExpr = "COALESCE(SUM((oi.price - COALESCE(NULLIF(oi.cost_price, 0), COALESCE(p.cost_price, 0))) * oi.qty), 0)";
} elseif ($hasCostColumn) {
    $profitExpr = "COALESCE(SUM((oi.price - p.cost_price) * oi.qty), 0)";
} else {
    $profitExpr = "0";
}

// ── 1. Summary ────────────────────────────────────────────────
$sumStmt = $db->prepare("
    SELECT
        COALESCE(SUM(oi.subtotal), 0) AS revenue,
        COUNT(DISTINCT o.id)          AS orders_paid,
        {$profitExpr}                 AS profit
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p     ON p.id        = oi.product_id
    WHERE o.payment_status = 'paid'
      AND DATE(o.created_at) BETWEEN ? AND ?
");
$sumStmt->execute([$dateFrom, $dateTo]);
$s = $sumStmt->fetch();

// Total semua order (untuk conversion rate)
$totStmt = $db->prepare(
    "SELECT COUNT(*) FROM orders WHERE DATE(created_at) BETWEEN ? AND ?"
);
$totStmt->execute([$dateFrom, $dateTo]);
$totalOrders = (int)$totStmt->fetchColumn();

// Revenue periode sebelumnya untuk growth %
$prevStmt = $db->prepare("
    SELECT COALESCE(SUM(total_amount), 0)
    FROM orders
    WHERE payment_status = 'paid'
      AND DATE(created_at) BETWEEN ? AND ?
");
$prevStmt->execute([$prevDateFrom, $prevDateTo]);
$prevRevenue = (float)$prevStmt->fetchColumn();

$revenue    = (float)$s['revenue'];
$profit     = (float)$s['profit'];
$ordersPaid = (int)$s['orders_paid'];
$avgOrder   = $ordersPaid > 0 ? round($revenue / $ordersPaid, 2) : 0;
$growth     = $prevRevenue > 0 ? round(($revenue - $prevRevenue) / $prevRevenue * 100, 1) : null;
$margin     = $revenue > 0 ? round($profit / $revenue * 100, 1) : 0;
$convRate   = $totalOrders > 0 ? round($ordersPaid / $totalOrders * 100, 1) : 0;

// ── 2. Tren revenue harian ────────────────────────────────────
$trendStmt = $db->prepare("
    SELECT DATE(created_at) AS date,
           COALESCE(SUM(total_amount), 0) AS revenue,
           COUNT(*) AS orders
    FROM orders
    WHERE payment_status = 'paid'
      AND DATE(created_at) BETWEEN ? AND ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
");
$trendStmt->execute([$dateFrom, $dateTo]);
$trendRaw = [];
foreach ($trendStmt->fetchAll() as $r) {
    $trendRaw[$r['date']] = ['revenue' => (float)$r['revenue'], 'orders' => (int)$r['orders']];
}
$trend = [];
$cur   = strtotime($dateFrom);
$end   = strtotime($dateTo);
while ($cur <= $end) {
    $d       = date('Y-m-d', $cur);
    $trend[] = ['date' => $d, 'revenue' => $trendRaw[$d]['revenue'] ?? 0, 'orders' => $trendRaw[$d]['orders'] ?? 0];
    $cur     = strtotime('+1 day', $cur);
}

// ── 3. Breakdown per kategori ─────────────────────────────────
$catStmt = $db->prepare("
    SELECT p.category,
           COALESCE(SUM(oi.subtotal), 0) AS revenue,
           COALESCE(SUM(oi.qty), 0)       AS qty_sold,
           {$profitExpr}                  AS profit
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o   ON o.id = oi.order_id
    WHERE o.payment_status = 'paid'
      AND DATE(o.created_at) BETWEEN ? AND ?
    GROUP BY p.category
    ORDER BY revenue DESC
");
$catStmt->execute([$dateFrom, $dateTo]);
$categories = array_map(fn($r) => [
    'category' => $r['category'],
    'revenue'  => (float)$r['revenue'],
    'qty_sold' => (int)$r['qty_sold'],
    'profit'   => (float)$r['profit'],
], $catStmt->fetchAll());

// ── 4. Top 10 produk ──────────────────────────────────────────
if ($hasOiCostColumn) {
    $cpCol = "COALESCE(NULLIF(AVG(NULLIF(oi.cost_price, 0)), 0), MAX(p.cost_price), 0) AS cost_price,";
} elseif ($hasCostColumn) {
    $cpCol = "p.cost_price,";
} else {
    $cpCol = "0 AS cost_price,";
}
$cpGroup = ($hasCostColumn && !$hasOiCostColumn) ? ", p.cost_price" : "";

$topStmt = $db->prepare("
    SELECT p.id, p.name, p.category, p.price, {$cpCol}
           COALESCE(SUM(oi.qty), 0)      AS qty_sold,
           COALESCE(SUM(oi.subtotal), 0) AS revenue,
           {$profitExpr}                 AS profit
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o   ON o.id = oi.order_id
    WHERE o.payment_status = 'paid'
      AND DATE(o.created_at) BETWEEN ? AND ?
    GROUP BY p.id, p.name, p.category, p.price{$cpGroup}
    ORDER BY revenue DESC
    LIMIT 10
");
$topStmt->execute([$dateFrom, $dateTo]);
$topProducts = array_map(function ($r) {
    $rev = (float)$r['revenue'];
    $pft = (float)$r['profit'];
    return [
        'id'         => (int)$r['id'],
        'name'       => $r['name'],
        'category'   => $r['category'],
        'price'      => (float)$r['price'],
        'cost_price' => (float)$r['cost_price'],
        'qty_sold'   => (int)$r['qty_sold'],
        'revenue'    => $rev,
        'profit'     => $pft,
        'margin'     => $rev > 0 ? round($pft / $rev * 100, 1) : 0,
    ];
}, $topStmt->fetchAll());

// ── 5. Peak hours ─────────────────────────────────────────────
$peakStmt = $db->prepare("
    SELECT HOUR(created_at) AS hour, COUNT(*) AS orders, SUM(total_amount) AS revenue
    FROM orders
    WHERE payment_status = 'paid'
      AND DATE(created_at) BETWEEN ? AND ?
    GROUP BY HOUR(created_at)
");
$peakStmt->execute([$dateFrom, $dateTo]);
$peakRaw = [];
foreach ($peakStmt->fetchAll() as $r) {
    $peakRaw[(int)$r['hour']] = ['orders' => (int)$r['orders'], 'revenue' => (float)$r['revenue']];
}
$peakHours = [];
for ($h = 0; $h < 24; $h++) {
    $peakHours[] = ['hour' => $h, 'orders' => $peakRaw[$h]['orders'] ?? 0, 'revenue' => $peakRaw[$h]['revenue'] ?? 0];
}

// ── 6. Utilisasi meja ─────────────────────────────────────────
$tblStmt = $db->prepare("
    SELECT t.table_name, COUNT(o.id) AS orders, SUM(o.total_amount) AS revenue
    FROM orders o
    JOIN `tables` t ON t.id = o.table_id
    WHERE o.payment_status = 'paid'
      AND DATE(o.created_at) BETWEEN ? AND ?
    GROUP BY t.id, t.table_name
    ORDER BY revenue DESC
");
$tblStmt->execute([$dateFrom, $dateTo]);
$tableStats = array_map(fn($r) => [
    'table_name' => $r['table_name'],
    'orders'     => (int)$r['orders'],
    'revenue'    => (float)$r['revenue'],
], $tblStmt->fetchAll());

// ── 7. Distribusi status pembayaran ───────────────────────────
$psStmt = $db->prepare("
    SELECT payment_status, COUNT(*) AS count
    FROM orders
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY payment_status
");
$psStmt->execute([$dateFrom, $dateTo]);
$paymentStatus = ['paid' => 0, 'pending' => 0, 'failed' => 0, 'cancelled' => 0];
foreach ($psStmt->fetchAll() as $r) {
    if (array_key_exists($r['payment_status'], $paymentStatus)) {
        $paymentStatus[$r['payment_status']] = (int)$r['count'];
    }
}

jsonResponse([
    'success' => true,
    'data'    => [
        'meta' => [
            'days'          => $days,
            'date_from'     => $dateFrom,
            'date_to'       => $dateTo,
            'is_custom'     => $isCustom,
            'has_cost_data' => $hasCostData,
        ],
        'summary' => [
            'revenue'         => $revenue,
            'revenue_prev'    => $prevRevenue,
            'revenue_growth'  => $growth,
            'profit'          => $profit,
            'profit_margin'   => $margin,
            'orders_paid'     => $ordersPaid,
            'orders_total'    => $totalOrders,
            'avg_order_value' => $avgOrder,
            'conversion_rate' => $convRate,
        ],
        'revenue_trend'      => $trend,
        'category_breakdown' => $categories,
        'top_products'       => $topProducts,
        'peak_hours'         => $peakHours,
        'table_stats'        => $tableStats,
        'payment_status'     => $paymentStatus,
    ],
]);
