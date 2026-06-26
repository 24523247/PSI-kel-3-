<?php
// ============================================================
// API: GET /backend/api/admin/system-notifications.php
// Mengembalikan produk dengan stok habis atau stok rendah
// langsung dari tabel products — tidak memerlukan tabel terpisah
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';

setJsonHeaders();
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$db = getDB();

// Cek apakah kolom stock sudah ada (migration_manager.sql)
$hasStock = false;
try {
    $db->query("SELECT stock FROM products LIMIT 0");
    $hasStock = true;
} catch (PDOException $e) {}

if (!$hasStock) {
    jsonResponse(['success' => true, 'data' => [], 'migration_needed' => true]);
}

$threshold = max(1, (int)($_GET['threshold'] ?? 5));

// Produk stok = 0 yang otomatis dinonaktifkan
$emptyStmt = $db->query("
    SELECT id, name, stock, category, price
    FROM products
    WHERE stock = 0 AND is_active = 0
    ORDER BY name
");

// Produk stok rendah (masih aktif, stok <= threshold)
$lowStmt = $db->prepare("
    SELECT id, name, stock, category, price
    FROM products
    WHERE stock IS NOT NULL AND stock > 0 AND stock <= ? AND is_active = 1
    ORDER BY stock ASC, name ASC
");
$lowStmt->execute([$threshold]);

$result = [];

foreach ($emptyStmt->fetchAll() as $p) {
    $result[] = [
        'id'       => (int)$p['id'],
        'name'     => $p['name'],
        'stock'    => 0,
        'category' => $p['category'],
        'price'    => (float)$p['price'],
        'type'     => 'stock_empty',
    ];
}
foreach ($lowStmt->fetchAll() as $p) {
    $result[] = [
        'id'       => (int)$p['id'],
        'name'     => $p['name'],
        'stock'    => (int)$p['stock'],
        'category' => $p['category'],
        'price'    => (float)$p['price'],
        'type'     => 'stock_low',
    ];
}

jsonResponse(['success' => true, 'data' => $result, 'migration_needed' => false]);
