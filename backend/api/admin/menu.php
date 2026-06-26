<?php
// ============================================================
// API: /backend/api/admin/menu.php  — CRUD Produk (Admin)
//
// GET              → semua produk (termasuk nonaktif)
// GET  ?id=X       → satu produk
// POST             → buat produk baru
// PUT              → update produk  (id di body JSON)
// DELETE ?id=X     → hapus produk
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';

setJsonHeaders();
requireAdmin();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id > 0) {
        $stmt = $db->prepare('SELECT * FROM products WHERE id = ?');
        $stmt->execute([$id]);
        $product = $stmt->fetch();
        if (!$product) {
            jsonResponse(['success' => false, 'message' => 'Produk tidak ditemukan'], 404);
        }
        $product['id']        = (int)$product['id'];
        $product['price']     = (int)$product['price'];
        $product['is_active'] = (int)$product['is_active'];
        if (array_key_exists('cost_price', $product)) $product['cost_price'] = (float)$product['cost_price'];
        if (array_key_exists('stock', $product))      $product['stock']      = $product['stock'] !== null ? (int)$product['stock'] : null;
        jsonResponse(['success' => true, 'data' => $product]);
    }

    $stmt     = $db->query('SELECT * FROM products ORDER BY created_at DESC');
    $products = $stmt->fetchAll();
    foreach ($products as &$p) {
        $p['id']        = (int)$p['id'];
        $p['price']     = (int)$p['price'];
        $p['is_active'] = (int)$p['is_active'];
        if (array_key_exists('cost_price', $p)) $p['cost_price'] = (float)$p['cost_price'];
        if (array_key_exists('stock', $p))      $p['stock']      = $p['stock'] !== null ? (int)$p['stock'] : null;
    }
    jsonResponse(['success' => true, 'data' => $products]);
}

// ── POST (Create) ────────────────────────────────────────────
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        jsonResponse(['success' => false, 'message' => 'Body tidak valid'], 400);
    }

    $name        = trim($body['name']        ?? '');
    $price       = (int)($body['price']      ?? 0);
    $category    = trim($body['category']    ?? '');
    $description = trim($body['description'] ?? '');
    $isActive    = isset($body['is_active']) ? (int)$body['is_active'] : 1;
    $imageBase64 = $body['image_base64']     ?? '';
    $imageUrl    = trim($body['image_url']   ?? '');

    if (empty($name) || $price <= 0 || empty($category)) {
        jsonResponse(['success' => false, 'message' => 'name, price, category wajib diisi'], 400);
    }

    // Simpan gambar jika ada base64
    if (!empty($imageBase64) && strpos($imageBase64, 'data:image') === 0) {
        $saved = saveBase64Image($imageBase64);
        if ($saved === false) {
            jsonResponse(['success' => false, 'message' => 'Gagal menyimpan gambar. Jalankan: chmod 775 frontend/image/ di root project.'], 500);
        }
        $imageUrl = $saved;
    }

    $costPrice = (float)($body['cost_price'] ?? 0);
    $stock     = isset($body['stock']) && $body['stock'] !== '' && $body['stock'] !== null ? (int)$body['stock'] : null;

    $stmt = $db->prepare('
        INSERT INTO products (name, price, category, description, image_url, is_active, cost_price, stock)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$name, $price, $category, $description ?: null, $imageUrl ?: null, $isActive, $costPrice, $stock]);
    $newId = $db->lastInsertId();

    jsonResponse([
        'success' => true,
        'message' => 'Produk berhasil ditambahkan',
        'data'    => ['id' => $newId]
    ], 201);
}

// ── PUT (Update) ─────────────────────────────────────────────
if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        jsonResponse(['success' => false, 'message' => 'Body tidak valid'], 400);
    }

    $id          = (int)($body['id']          ?? 0);
    $name        = trim($body['name']         ?? '');
    $price       = (int)($body['price']       ?? 0);
    $category    = trim($body['category']     ?? '');
    $description = trim($body['description']  ?? '');
    $isActive    = isset($body['is_active']) ? (int)$body['is_active'] : 1;
    $imageBase64 = $body['image_base64']      ?? '';
    $imageUrl    = trim($body['image_url']    ?? '');

    if ($id <= 0 || empty($name) || $price <= 0 || empty($category)) {
        jsonResponse(['success' => false, 'message' => 'id, name, price, category wajib diisi'], 400);
    }

    // Cek produk ada
    $stmt = $db->prepare('SELECT id, image_url FROM products WHERE id = ?');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        jsonResponse(['success' => false, 'message' => 'Produk tidak ditemukan'], 404);
    }

    // Simpan gambar baru jika ada
    if (!empty($imageBase64) && strpos($imageBase64, 'data:image') === 0) {
        $saved = saveBase64Image($imageBase64);
        if ($saved !== false) {
            // Hapus gambar lama setelah berhasil simpan yang baru
            if (!empty($existing['image_url'])) {
                $oldPath = __DIR__ . '/../../../' . ltrim($existing['image_url'], '/');
                if (file_exists($oldPath)) @unlink($oldPath);
            }
            $imageUrl = $saved;
        } else {
            // Gagal simpan gambar baru — pertahankan gambar lama, tetap update data lain
            $imageUrl = $existing['image_url'];
        }
    } else {
        // Tidak ada upload baru — pertahankan gambar lama
        $imageUrl = $existing['image_url'];
    }

    $costPrice = (float)($body['cost_price'] ?? 0);
    $stock     = isset($body['stock']) && $body['stock'] !== '' && $body['stock'] !== null ? (int)$body['stock'] : null;

    $stmt = $db->prepare('
        UPDATE products
        SET name = ?, price = ?, category = ?, description = ?, image_url = ?, is_active = ?, cost_price = ?, stock = ?
        WHERE id = ?
    ');
    $stmt->execute([$name, $price, $category, $description ?: null, $imageUrl ?: null, $isActive, $costPrice, $stock, $id]);

    jsonResponse(['success' => true, 'message' => 'Produk berhasil diperbarui']);
}

// ── DELETE ───────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'message' => 'Parameter id wajib diisi'], 400);
    }

    $stmt = $db->prepare('SELECT id, image_url FROM products WHERE id = ?');
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    if (!$product) {
        jsonResponse(['success' => false, 'message' => 'Produk tidak ditemukan'], 404);
    }

    // Cek apakah produk pernah dipesan (FK constraint ke order_items)
    $stmt = $db->prepare('SELECT COUNT(*) FROM order_items WHERE product_id = ?');
    $stmt->execute([$id]);
    $hasOrders = (int)$stmt->fetchColumn() > 0;

    if ($hasOrders) {
        // Soft delete: nonaktifkan saja agar histori pesanan tetap utuh
        $stmt = $db->prepare('UPDATE products SET is_active = 0 WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse([
            'success'     => true,
            'soft_delete' => true,
            'message'     => 'Produk dinonaktifkan karena memiliki riwayat pesanan.',
        ]);
    }

    // Tidak ada pesanan — hapus permanen beserta gambarnya
    if (!empty($product['image_url']) && strpos($product['image_url'], '/frontend/') !== false) {
        $path = __DIR__ . '/../../../' . ltrim($product['image_url'], '/');
        if (file_exists($path)) @unlink($path);
    }

    $stmt = $db->prepare('DELETE FROM products WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(['success' => true, 'message' => 'Produk berhasil dihapus.']);
}

jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);

// ── Helper ───────────────────────────────────────────────────
function saveBase64Image(string $base64): string|false {
    if (preg_match('#^data:image/(\w+);base64,#i', $base64, $m)) {
        $ext = strtolower($m[1]);
        if ($ext === 'jpeg') $ext = 'jpg';
    } else {
        $ext = 'jpg';
    }

    $data     = preg_replace('#^data:image/\w+;base64,#i', '', $base64);
    $filename = 'menu_' . time() . '_' . substr(uniqid(), -6) . '.' . $ext;
    $dir      = __DIR__ . '/../../../frontend/image/';

    if (!is_dir($dir)) mkdir($dir, 0775, true);

    if (!is_writable($dir)) {
        // Coba set permission (hanya berhasil jika PHP punya akses)
        @chmod($dir, 0775);
        if (!is_writable($dir)) return false;
    }

    $bytes = base64_decode($data);
    if ($bytes === false) return false;
    if (file_put_contents($dir . $filename, $bytes) === false) return false;

    return '/frontend/image/' . $filename;
}
