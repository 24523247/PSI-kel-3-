<?php
// ============================================================
// API: GET /backend/api/admin/stock-alerts.php
// Produk yang stoknya habis (0) atau hampir habis (<= threshold)
// Query param: ?threshold=5  (default 5)
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';

setJsonHeaders();
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$db = getDB();

// Kolom stock belum ada jika migration_manager.sql belum dijalankan
try {
    $db->query("SELECT stock FROM products LIMIT 0");
} catch (PDOException $e) {
    jsonResponse(['success' => true, 'data' => [
        'out_of_stock'   => [],
        'low_stock'      => [],
        'total_tracked'  => 0,
        'migration_needed' => true,
    ]]);
}

$threshold = max(1, min(50, (int)($_GET['threshold'] ?? 5)));

$stmt = $db->query("
    SELECT id, name, category, price, stock
    FROM products
    WHERE stock IS NOT NULL AND is_active = 1
    ORDER BY stock ASC, name ASC
");
$products = $stmt->fetchAll();

$outOfStock = [];
$lowStock   = [];

foreach ($products as $p) {
    $item = [
        'id'       => (int)$p['id'],
        'name'     => $p['name'],
        'category' => $p['category'],
        'price'    => (int)$p['price'],
        'stock'    => (int)$p['stock'],
    ];
    if ((int)$p['stock'] === 0) {
        $outOfStock[] = $item;
    } elseif ((int)$p['stock'] <= $threshold) {
        $lowStock[] = $item;
    }
}

jsonResponse([
    'success' => true,
    'data'    => [
        'out_of_stock'     => $outOfStock,
        'low_stock'        => $lowStock,
        'total_tracked'    => count($products),
        'migration_needed' => false,
    ],
]);
