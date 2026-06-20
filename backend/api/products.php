<?php
// ============================================================
// API: GET /api/products.php
// Mengambil semua menu yang aktif
// ============================================================

require_once __DIR__ . '/../config.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$db = getDB();

$stmt = $db->query('SELECT id, name, price, category, description, image_url FROM products WHERE is_active = 1 ORDER BY category, name');
$products = $stmt->fetchAll();

// Format harga jadi integer supaya mudah diolah di JS
foreach ($products as &$p) {
    $p['price'] = (int) $p['price'];
}

jsonResponse([
    'success' => true,
    'data'    => $products
]);
