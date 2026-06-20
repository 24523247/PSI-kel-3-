<?php
// ============================================================
// API: POST /api/create-order.php
// Membuat pesanan baru dari meja tertentu
//
// Request body (JSON):
// {
//   "table_code": "meja-1",
//   "items": [
//     { "product_id": 1, "qty": 2 },
//     { "product_id": 5, "qty": 1 }
//   ]
// }
// ============================================================

require_once __DIR__ . '/../config.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

// Baca body JSON
$body = json_decode(file_get_contents('php://input'), true);

if (!$body) {
    jsonResponse(['success' => false, 'message' => 'Body request tidak valid (harus JSON)'], 400);
}

$tableCode = trim($body['table_code'] ?? '');
$items     = $body['items'] ?? [];

// Validasi dasar
if (empty($tableCode)) {
    jsonResponse(['success' => false, 'message' => 'table_code wajib diisi'], 400);
}

if (empty($items) || !is_array($items)) {
    jsonResponse(['success' => false, 'message' => 'items wajib diisi dan tidak boleh kosong'], 400);
}

$db = getDB();

// Cek meja ada atau tidak
$stmt = $db->prepare('SELECT id FROM `tables` WHERE table_code = ?');
$stmt->execute([$tableCode]);
$table = $stmt->fetch();

if (!$table) {
    jsonResponse(['success' => false, 'message' => 'Meja tidak ditemukan'], 404);
}

$tableId = $table['id'];

// Proses setiap item: ambil harga dari DB (jangan percaya harga dari client!)
$orderItems  = [];
$totalAmount = 0;

foreach ($items as $item) {
    $productId = (int)($item['product_id'] ?? 0);
    $qty       = (int)($item['qty'] ?? 0);

    if ($productId <= 0 || $qty <= 0) {
        jsonResponse(['success' => false, 'message' => 'product_id dan qty harus lebih dari 0'], 400);
    }

    // Ambil harga dari database
    $stmt = $db->prepare('SELECT id, name, price FROM products WHERE id = ? AND is_active = 1');
    $stmt->execute([$productId]);
    $product = $stmt->fetch();

    if (!$product) {
        jsonResponse(['success' => false, 'message' => "Produk ID $productId tidak ditemukan"], 404);
    }

    $price    = (float) $product['price'];
    $subtotal = $price * $qty;

    $orderItems[] = [
        'product_id' => $productId,
        'name'       => $product['name'],
        'qty'        => $qty,
        'price'      => $price,
        'subtotal'   => $subtotal,
    ];

    $totalAmount += $subtotal;
}

// Generate kode order unik: ORD-{timestamp}-{random}
$orderCode = 'ORD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));

// Simpan ke database dalam satu transaksi
try {
    $db->beginTransaction();

    // Insert order header
    $stmt = $db->prepare('INSERT INTO orders (order_code, table_id, total_amount, payment_status) VALUES (?, ?, ?, ?)');
    $stmt->execute([$orderCode, $tableId, $totalAmount, 'pending']);
    $orderId = $db->lastInsertId();

    // Insert order items
    $stmt = $db->prepare('INSERT INTO order_items (order_id, product_id, qty, price, subtotal) VALUES (?, ?, ?, ?, ?)');
    foreach ($orderItems as $oi) {
        $stmt->execute([$orderId, $oi['product_id'], $oi['qty'], $oi['price'], $oi['subtotal']]);
    }

    $db->commit();

} catch (Exception $e) {
    $db->rollBack();
    jsonResponse(['success' => false, 'message' => 'Gagal menyimpan pesanan: ' . $e->getMessage()], 500);
}

jsonResponse([
    'success' => true,
    'message' => 'Pesanan berhasil dibuat',
    'data' => [
        'order_id'     => $orderId,
        'order_code'   => $orderCode,
        'total_amount' => $totalAmount,
    ]
]);
