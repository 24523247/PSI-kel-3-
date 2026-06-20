<?php
// ============================================================
// API: POST /api/create-payment.php
// Membuat transaksi Midtrans Snap dan mengembalikan snap_token
//
// Request body (JSON):
// { "order_code": "ORD-20241201-ABC123" }
//
// Cara kerja Midtrans Snap:
// 1. Kita kirim data transaksi ke API Midtrans
// 2. Midtrans membalas dengan snap_token
// 3. snap_token ini kita lempar ke frontend
// 4. Frontend membuka popup pembayaran Midtrans menggunakan token tersebut
// ============================================================

require_once __DIR__ . '/../config.php';

// SDK Midtrans diletakkan di folder backend/midtrans-sdk/
// Kita hanya butuh file Snap.php sebagai entry point
require_once __DIR__ . '/../midtrans-sdk/Snap.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$body      = json_decode(file_get_contents('php://input'), true);
$orderCode = trim($body['order_code'] ?? '');

if (empty($orderCode)) {
    jsonResponse(['success' => false, 'message' => 'order_code wajib diisi'], 400);
}

$db = getDB();

// Ambil data order beserta meja dan items
$stmt = $db->prepare('
    SELECT o.id, o.order_code, o.total_amount, o.payment_status, o.snap_token,
           t.table_name
    FROM orders o
    JOIN `tables` t ON t.id = o.table_id
    WHERE o.order_code = ?
');
$stmt->execute([$orderCode]);
$order = $stmt->fetch();

if (!$order) {
    jsonResponse(['success' => false, 'message' => 'Pesanan tidak ditemukan'], 404);
}

// Kalau sudah lunas, tidak perlu bayar lagi
if ($order['payment_status'] === 'paid') {
    jsonResponse(['success' => false, 'message' => 'Pesanan ini sudah lunas'], 400);
}

// Kalau sudah ada snap_token sebelumnya, kembalikan saja
// (menghindari double request ke Midtrans)
if (!empty($order['snap_token'])) {
    jsonResponse([
        'success'    => true,
        'snap_token' => $order['snap_token'],
        'order_code' => $orderCode,
    ]);
}

// Ambil detail items untuk dikirim ke Midtrans
$stmt = $db->prepare('
    SELECT oi.qty, oi.price, oi.subtotal, p.name
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
');
$stmt->execute([$order['id']]);
$items = $stmt->fetchAll();

// Format item_details untuk Midtrans
$itemDetails = [];
foreach ($items as $item) {
    $itemDetails[] = [
        'id'       => 'ITEM-' . uniqid(),
        'price'    => (int) $item['price'],
        'quantity' => (int) $item['qty'],
        'name'     => $item['name'],
    ];
}

// ============================================================
// Set konfigurasi Midtrans
// ============================================================
\Midtrans\Config::$serverKey      = MIDTRANS_SERVER_KEY;
\Midtrans\Config::$isProduction   = MIDTRANS_IS_PRODUCTION;
\Midtrans\Config::$isSanitized    = true;
\Midtrans\Config::$is3ds          = true;

// ============================================================
// Parameter transaksi yang dikirim ke Midtrans
// ============================================================
$params = [
    'transaction_details' => [
        'order_id'     => $orderCode,         // harus unik di Midtrans
        'gross_amount' => (int) $order['total_amount'],
    ],
    'item_details' => $itemDetails,
    'customer_details' => [
        'first_name' => 'Pelanggan',
        'last_name'  => $order['table_name'],
        'email'      => 'pelanggan@restoran.com',
        'phone'      => '08123456789',
    ],
];

// Panggil Midtrans API untuk mendapatkan snap_token
try {
    $snapToken = \Midtrans\Snap::getSnapToken($params);
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Gagal membuat transaksi Midtrans: ' . $e->getMessage()
    ], 500);
}

// Simpan snap_token ke database supaya tidak double request
$stmt = $db->prepare('UPDATE orders SET snap_token = ? WHERE id = ?');
$stmt->execute([$snapToken, $order['id']]);

jsonResponse([
    'success'    => true,
    'snap_token' => $snapToken,
    'order_code' => $orderCode,
]);
