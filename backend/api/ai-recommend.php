<?php
// ============================================================
// API: POST /api/ai-recommend.php
// Rekomendasi menu berbasis AI menggunakan KoboiLLM
// Body JSON: { "preference": "string" }
// ============================================================

require_once __DIR__ . '/../config.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$body       = json_decode(file_get_contents('php://input'), true);
$preference = trim($body['preference'] ?? '');

if (empty($preference)) {
    $preference = 'Rekomendasikan menu terpopuler dan terlezat';
}

// Ambil semua menu aktif dari database
$db   = getDB();
$stmt = $db->query('SELECT id, name, price, category, description FROM products WHERE is_active = 1 ORDER BY category, name');
$products = $stmt->fetchAll();

// Susun daftar menu untuk prompt
$menuText = '';
foreach ($products as $p) {
    $price = number_format((float)$p['price'], 0, ',', '.');
    $desc  = !empty($p['description']) ? " — {$p['description']}" : '';
    $menuText .= "ID:{$p['id']} {$p['name']} (Rp {$price}){$desc}\n";
}

$prompt = <<<PROMPT
Kamu adalah asisten restoran Warung Pak Budi yang ramah dan membantu. Berikut daftar menu kami:

{$menuText}
Pelanggan berkata: "{$preference}"

Rekomendasikan TEPAT 2 atau 3 menu dari daftar di atas yang paling sesuai dengan keinginan pelanggan.
Jawab HANYA dengan JSON array tanpa teks lain dan tanpa markdown code block:
[{"id": 1, "reason": "Alasan singkat dalam Bahasa Indonesia (maks 15 kata)"}]
PROMPT;

$apiKey = KOBOI_API_KEY;
if (empty($apiKey)) {
    jsonResponse([
        'success' => false,
        'message' => 'Fitur AI belum aktif. Tambahkan KOBOI_API_KEY di backend/.env',
    ]);
}

// KoboiLLM — OpenAI-compatible endpoint
$endpoint = 'https://lite.koboillm.com/v1/chat/completions';
$payload  = json_encode([
    'model'       => 'gemini/gemini-2.5-flash',
    'messages'    => [
        [
            'role'    => 'system',
            'content' => 'Kamu adalah asisten restoran. Selalu jawab HANYA dengan JSON array murni, tanpa markdown, tanpa penjelasan, tanpa code block. Format: [{"id": number, "reason": "string"}]',
        ],
        ['role' => 'user', 'content' => $prompt],
    ],
    'temperature' => 0.4,
    'max_tokens'  => 2000,
]);

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    jsonResponse(['success' => false, 'message' => 'Koneksi ke KoboiLLM gagal: ' . $curlError]);
}

if ($httpCode !== 200) {
    $err = json_decode($response, true);
    $msg = $err['error']['message'] ?? ('HTTP ' . $httpCode);
    jsonResponse(['success' => false, 'message' => 'KoboiLLM error: ' . $msg]);
}

// Ambil teks dari respons OpenAI-compatible
$responseData = json_decode($response, true);
$text         = $responseData['choices'][0]['message']['content'] ?? '';

// Ekstrak JSON array: cari posisi [ pertama dan ] terakhir
$start = strpos($text, '[');
$end   = strrpos($text, ']');

$recommendations = null;
if ($start !== false && $end !== false && $end > $start) {
    $jsonStr         = substr($text, $start, $end - $start + 1);
    $recommendations = json_decode($jsonStr, true);
}

if (!is_array($recommendations) || empty($recommendations)) {
    jsonResponse(['success' => false, 'message' => 'AI tidak dapat memberikan rekomendasi saat ini.']);
}

// Perkaya dengan data produk dari database
$productMap = [];
foreach ($products as $p) {
    $productMap[(int)$p['id']] = $p;
}

$enriched = [];
foreach ($recommendations as $rec) {
    $id = (int)($rec['id'] ?? 0);
    if (isset($productMap[$id]) && !empty($rec['reason'])) {
        $p          = $productMap[$id];
        $enriched[] = [
            'id'       => $id,
            'name'     => $p['name'],
            'price'    => (int)$p['price'],
            'category' => $p['category'],
            'reason'   => $rec['reason'],
        ];
    }
}

jsonResponse(['success' => true, 'data' => $enriched]);
