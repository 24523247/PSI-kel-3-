<?php
// ============================================================
// API: POST /backend/api/admin/ai-menu-parse.php
// Terima perintah natural language → kembalikan intent + SQL
// AI hanya menerjemahkan, TIDAK mengeksekusi SQL.
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/ai-menu-helpers.php';

setJsonHeaders();
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$body   = json_decode(file_get_contents('php://input'), true);
$prompt = trim($body['prompt'] ?? '');

if (empty($prompt)) {
    jsonResponse(['success' => false, 'message' => 'prompt wajib diisi'], 400);
}
if (mb_strlen($prompt) > 500) {
    jsonResponse(['success' => false, 'message' => 'Perintah terlalu panjang (maks 500 karakter)'], 400);
}

// ── Rate limiting: 15 request per 5 menit per sesi ──────────
if (session_status() === PHP_SESSION_NONE) session_start();
$now     = time();
$history = array_filter($_SESSION['ai_rate'] ?? [], fn($t) => $now - $t < 300);
if (count($history) >= 15) {
    jsonResponse(['success' => false, 'message' => 'Terlalu banyak permintaan. Tunggu beberapa menit.'], 429);
}
$history[] = $now;
$_SESSION['ai_rate'] = array_values($history);

$apiKey = KOBOI_API_KEY;
if (empty($apiKey)) {
    jsonResponse(['success' => false, 'message' => 'KOBOI_API_KEY belum diisi di backend/.env']);
}

// ── Ambil daftar produk saat ini ──────────────────────────
$db = getDB();

// Cek kolom tambahan dari migration_manager.sql
$hasCostCol  = false;
$hasStockCol = false;
try { $db->query("SELECT cost_price FROM products LIMIT 0"); $hasCostCol  = true; } catch (PDOException $e) {}
try { $db->query("SELECT stock FROM products LIMIT 0");      $hasStockCol = true; } catch (PDOException $e) {}

$extraCols = ($hasCostCol ? ', cost_price' : '') . ($hasStockCol ? ', stock' : '');
$stmt      = $db->query("SELECT id, name, price, category, is_active{$extraCols} FROM products ORDER BY category, name");
$products  = $stmt->fetchAll();

$menuList = '';
foreach ($products as $p) {
    $status   = (int)$p['is_active'] === 1 ? 'aktif' : 'nonaktif';
    $costStr  = $hasCostCol  ? ' | HPP:Rp' . number_format((float)($p['cost_price'] ?? 0), 0, ',', '.') : '';
    $stockVal = $hasStockCol ? ($p['stock'] ?? null) : null;
    $stockStr = $hasStockCol ? ' | stok:' . ($stockVal === null ? 'tidak_tracking' : ($stockVal == 0 ? 'HABIS' : $stockVal)) : '';
    $menuList .= "ID:{$p['id']} | {$p['name']} | Rp" . number_format((float)$p['price'], 0, ',', '.') . "{$costStr} | {$p['category']}{$stockStr} | {$status}\n";
}

// ── System prompt ──────────────────────────────────────────
$systemMsg = <<<'SYSTEM'
Kamu adalah AI assistant untuk manajemen menu restoran. Tugasmu HANYA menerjemahkan perintah bahasa natural menjadi structured JSON.

SKEMA DATABASE:
Tabel: products
Kolom: id (INT, auto), name (VARCHAR), price (INT, Rupiah), category (VARCHAR: 'makanan'|'minuman'), description (TEXT, opsional), is_active (TINYINT: 1=aktif, 0=nonaktif), cost_price (DECIMAL, HPP/harga pokok, default 0), stock (INT, NULL=tidak tracking, 0=habis, angka=jumlah stok)

ATURAN WAJIB:
1. DELETE = UPDATE products SET is_active = 0 WHERE id = ? (JANGAN pakai DELETE FROM)
2. Selalu gunakan ? placeholder, JANGAN tempel nilai langsung ke SQL
3. Jika ada beberapa produk dengan nama mirip, wajib set need_clarification=true
4. Jika confidence < 0.80, wajib set need_clarification=true
5. CREATE, UPDATE, DELETE: need_confirmation=true
6. SELECT: need_confirmation=false
7. DILARANG akses tabel selain products
8. Jika perintah tidak ada kaitannya dengan menu restoran, set intent=UNKNOWN

FORMAT OUTPUT (JSON murni, TANPA markdown, TANPA penjelasan tambahan):
{
  "intent": "CREATE_MENU|READ_MENU|UPDATE_MENU|DELETE_MENU|UNKNOWN",
  "confidence": 0.95,
  "need_confirmation": true,
  "need_clarification": false,
  "clarification_question": null,
  "message": "Penjelasan singkat aksi dalam Bahasa Indonesia",
  "sql": "SQL dengan ? placeholder",
  "params": [nilai1, nilai2]
}
SYSTEM;

// ── User message: konteks produk + perintah ────────────────
$userMsg = "Daftar menu saat ini:\n{$menuList}\nPerintah admin: \"{$prompt}\"";

// ── Kirim ke KoboiLLM ──────────────────────────────────────
$payload = json_encode([
    'model'       => 'gemini-2.5-flash',
    'messages'    => [
        ['role' => 'system', 'content' => $systemMsg],
        ['role' => 'user',   'content' => $userMsg],
    ],
    'temperature' => 0.1,
    'max_tokens'  => 2000,
]);

$ch = curl_init('https://lite.koboillm.com/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    jsonResponse(['success' => false, 'message' => 'Koneksi ke AI gagal: ' . $curlError]);
}
if ($httpCode !== 200) {
    $errData = json_decode($response, true);
    $errMsg  = $errData['error']['message'] ?? ('HTTP ' . $httpCode);
    jsonResponse(['success' => false, 'message' => 'AI error: ' . $errMsg]);
}

// ── Ekstrak JSON dari response (strip markdown fence) ──────
$respData = json_decode($response, true);
$text     = $respData['choices'][0]['message']['content'] ?? '';

$start  = strpos($text, '{');
$end    = strrpos($text, '}');
$parsed = null;
if ($start !== false && $end !== false && $end > $start) {
    $parsed = json_decode(substr($text, $start, $end - $start + 1), true);
}

if (!is_array($parsed) || empty($parsed['intent'])) {
    jsonResponse(['success' => false, 'message' => 'AI tidak dapat memproses perintah. Coba ulangi dengan kalimat berbeda.']);
}

$intent     = strtoupper(trim($parsed['intent']));
$confidence = (float)($parsed['confidence'] ?? 0);

// ── Handle UNKNOWN / confidence rendah ────────────────────
if ($intent === 'UNKNOWN' || $confidence < 0.70) {
    $stmt = $db->prepare('INSERT INTO ai_menu_logs (admin_id, prompt, intent, status) VALUES (?, ?, ?, ?)');
    $stmt->execute([$_SESSION['admin_id'], $prompt, 'UNKNOWN', 'failed']);

    jsonResponse([
        'success'              => true,
        'intent'               => 'UNKNOWN',
        'confidence'           => $confidence,
        'need_confirmation'    => false,
        'need_clarification'   => true,
        'clarification_question' => "Maaf, saya tidak memahami perintah tersebut.\n\nContoh perintah yang bisa digunakan:\n• Tambah menu Ayam Geprek harga 15000 kategori makanan\n• Ubah harga Es Teh menjadi 6000\n• Nonaktifkan menu Gado-Gado\n• Tampilkan semua menu minuman",
        'message'              => null,
        'sql'                  => null,
        'params'               => null,
        'log_id'               => null,
    ]);
}

// ── Handle perlu klarifikasi ───────────────────────────────
if (!empty($parsed['need_clarification'])) {
    $stmt = $db->prepare('INSERT INTO ai_menu_logs (admin_id, prompt, intent, status) VALUES (?, ?, ?, ?)');
    $stmt->execute([$_SESSION['admin_id'], $prompt, $intent, 'pending']);
    $logId = (int)$db->lastInsertId();

    jsonResponse([
        'success'              => true,
        'intent'               => $intent,
        'confidence'           => $confidence,
        'need_confirmation'    => false,
        'need_clarification'   => true,
        'clarification_question' => $parsed['clarification_question'] ?? 'Tolong berikan informasi yang lebih spesifik.',
        'message'              => $parsed['message'] ?? null,
        'sql'                  => null,
        'params'               => null,
        'log_id'               => $logId,
    ]);
}

// ── Validasi SQL ───────────────────────────────────────────
$sql    = trim($parsed['sql'] ?? '');
$params = $parsed['params'] ?? [];

if (empty($sql)) {
    jsonResponse(['success' => false, 'message' => 'AI tidak menghasilkan SQL. Coba ulangi perintah.']);
}
if (!is_array($params)) {
    $params = [];
}

$validation = validateAISQL($sql);
if ($validation !== true) {
    // Log percobaan SQL tidak valid
    $stmt = $db->prepare('INSERT INTO ai_menu_logs (admin_id, prompt, intent, generated_sql, status, result_message) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$_SESSION['admin_id'], $prompt, $intent, $sql, 'failed', 'Validasi SQL gagal: ' . $validation]);

    jsonResponse(['success' => false, 'message' => 'SQL yang dihasilkan AI tidak lolos validasi keamanan.']);
}

// Validasi jumlah placeholder ? sesuai params
$placeholderCount = substr_count($sql, '?');
if (count($params) !== $placeholderCount) {
    jsonResponse(['success' => false, 'message' => 'Jumlah parameter AI tidak sesuai SQL. Coba ulangi.']);
}

// ── Simpan ke audit log ────────────────────────────────────
$stmt = $db->prepare(
    'INSERT INTO ai_menu_logs (admin_id, prompt, intent, generated_sql, params, status) VALUES (?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $_SESSION['admin_id'],
    $prompt,
    $intent,
    $sql,
    json_encode($params),
    'pending',
]);
$logId = (int)$db->lastInsertId();

jsonResponse([
    'success'            => true,
    'intent'             => $intent,
    'confidence'         => $confidence,
    'need_confirmation'  => !empty($parsed['need_confirmation']),
    'need_clarification' => false,
    'message'            => $parsed['message'] ?? '',
    'sql'                => $sql,
    'params'             => $params,
    'log_id'             => $logId,
]);
