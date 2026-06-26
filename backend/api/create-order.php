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

// Deteksi kolom opsional
$hasStockCol  = false;
$hasCostCol   = false;
$hasOiCostCol = false;
try { $db->query("SELECT stock      FROM products   LIMIT 0"); $hasStockCol  = true; } catch (PDOException $e) {}
try { $db->query("SELECT cost_price FROM products   LIMIT 0"); $hasCostCol   = true; } catch (PDOException $e) {}
try { $db->query("SELECT cost_price FROM order_items LIMIT 0"); $hasOiCostCol = true; } catch (PDOException $e) {}

$prodColArr = ['id', 'name', 'price'];
if ($hasCostCol)  $prodColArr[] = 'cost_price';
if ($hasStockCol) $prodColArr[] = 'stock';
$prodCols = implode(', ', $prodColArr);
$prodStmt = $db->prepare("SELECT {$prodCols} FROM products WHERE id = ? AND is_active = 1");

foreach ($items as $item) {
    $productId = (int)($item['product_id'] ?? 0);
    $qty       = (int)($item['qty'] ?? 0);

    if ($productId <= 0 || $qty <= 0) {
        jsonResponse(['success' => false, 'message' => 'product_id dan qty harus lebih dari 0'], 400);
    }

    // Ambil harga dari database
    $prodStmt->execute([$productId]);
    $product = $prodStmt->fetch();

    if (!$product) {
        jsonResponse(['success' => false, 'message' => "Menu tidak tersedia atau sudah tidak aktif"], 404);
    }

    // Validasi stok jika tracking aktif
    if ($hasStockCol && $product['stock'] !== null) {
        if ((int)$product['stock'] === 0) {
            jsonResponse(['success' => false, 'message' => "Menu \"{$product['name']}\" sedang habis"], 400);
        }
        if ($qty > (int)$product['stock']) {
            jsonResponse([
                'success' => false,
                'message' => "Stok \"{$product['name']}\" tidak cukup. Tersedia: {$product['stock']}, diminta: {$qty}",
            ], 400);
        }
    }

    $price     = (float)$product['price'];
    $costPrice = $hasCostCol ? (float)($product['cost_price'] ?? 0) : 0;
    $subtotal  = $price * $qty;

    $orderItems[] = [
        'product_id' => $productId,
        'qty'        => $qty,
        'price'      => $price,
        'cost_price' => $costPrice,
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

    // Insert order items — sertakan cost_price snapshot jika kolom sudah ada
    if ($hasOiCostCol) {
        $stmt = $db->prepare('INSERT INTO order_items (order_id, product_id, qty, price, cost_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($orderItems as $oi) {
            $stmt->execute([$orderId, $oi['product_id'], $oi['qty'], $oi['price'], $oi['cost_price'], $oi['subtotal']]);
        }
    } else {
        $stmt = $db->prepare('INSERT INTO order_items (order_id, product_id, qty, price, subtotal) VALUES (?, ?, ?, ?, ?)');
        foreach ($orderItems as $oi) {
            $stmt->execute([$orderId, $oi['product_id'], $oi['qty'], $oi['price'], $oi['subtotal']]);
        }
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
