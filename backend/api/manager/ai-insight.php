<?php
// ============================================================
// API: /backend/api/manager/ai-insight.php
// GET  → kembalikan insight dari cache (atau { cached: false })
// POST → generate insight baru, simpan ke cache, kembalikan
//
// Cache disimpan di backend/cache/manager_insight.json
// Tidak auto-generate — hanya dibuat saat user minta (POST)
// ============================================================

set_time_limit(120);

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';

setJsonHeaders();
requireManager();

$cacheDir  = __DIR__ . '/../../cache';
$cacheFile = $cacheDir . '/manager_insight.json';

// ── GET: kembalikan cache ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!file_exists($cacheFile)) {
        jsonResponse(['success' => true, 'cached' => false]);
    }
    $cache = json_decode(file_get_contents($cacheFile), true);
    if (!$cache || empty($cache['insight'])) {
        jsonResponse(['success' => true, 'cached' => false]);
    }
    jsonResponse(['success' => true, 'cached' => true, 'data' => $cache]);
}

// ── POST: generate insight baru ───────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $apiKey = KOBOI_API_KEY;
    if (empty($apiKey)) {
        jsonResponse(['success' => false, 'message' => 'KOBOI_API_KEY belum diisi di backend/.env'], 500);
    }

    $body = json_decode(file_get_contents('php://input'), true);
    $days = min(90, max(7, (int)($body['days'] ?? 30)));

    $db = getDB();

    // Deteksi kolom opsional
    $hasCostP  = false;
    $hasCostOi = false;
    $hasStock  = false;
    try { $db->query("SELECT cost_price FROM products    LIMIT 0"); $hasCostP  = true; } catch (PDOException $e) {}
    try { $db->query("SELECT cost_price FROM order_items LIMIT 0"); $hasCostOi = true; } catch (PDOException $e) {}
    try { $db->query("SELECT stock FROM products         LIMIT 0"); $hasStock  = true; } catch (PDOException $e) {}

    // Profit expression: gunakan snapshot order_items jika ada
    if ($hasCostOi) {
        $profitExpr = "COALESCE(SUM((oi.price - COALESCE(NULLIF(oi.cost_price,0), COALESCE(p.cost_price,0))) * oi.qty), 0)";
    } elseif ($hasCostP) {
        $profitExpr = "COALESCE(SUM((oi.price - p.cost_price) * oi.qty), 0)";
    } else {
        $profitExpr = "0";
    }

    // ── 1. Summary ──────────────────────────────────────────
    $sumStmt = $db->prepare("
        SELECT
            COALESCE(SUM(oi.subtotal), 0) AS revenue,
            COUNT(DISTINCT o.id)          AS orders_paid,
            {$profitExpr}                 AS profit
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN products p     ON p.id = oi.product_id
        WHERE o.payment_status = 'paid'
          AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ");
    $sumStmt->execute([$days]);
    $sum = $sumStmt->fetch();

    $totalStmt = $db->prepare("SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $totalStmt->execute([$days]);
    $totalOrders = (int)$totalStmt->fetchColumn();

    $revenue    = (float)$sum['revenue'];
    $profit     = (float)$sum['profit'];
    $ordersPaid = (int)$sum['orders_paid'];
    $margin     = $revenue > 0 ? round($profit / $revenue * 100, 1) : 0;
    $convRate   = $totalOrders > 0 ? round($ordersPaid / $totalOrders * 100, 1) : 0;
    $hasProfit  = ($hasCostP || $hasCostOi) && $profit > 0;

    // ── 2. Top 5 produk ─────────────────────────────────────
    $topStmt = $db->prepare("
        SELECT p.name,
               SUM(oi.qty)      AS qty,
               SUM(oi.subtotal) AS revenue,
               {$profitExpr}    AS profit
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o   ON o.id = oi.order_id
        WHERE o.payment_status = 'paid'
          AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY p.id, p.name
        ORDER BY revenue DESC
        LIMIT 5
    ");
    $topStmt->execute([$days]);

    $topForAI = array_map(function ($p) use ($hasProfit) {
        $rev = (float)$p['revenue'];
        $pft = (float)$p['profit'];
        $row = ['nama' => $p['name'], 'terjual' => (int)$p['qty'], 'revenue' => (int)$rev];
        if ($hasProfit) $row['margin_persen'] = $rev > 0 ? round($pft / $rev * 100, 1) : 0;
        return $row;
    }, $topStmt->fetchAll());

    // ── 3. Produk paling sepi (aktif) ───────────────────────
    $slowStmt = $db->prepare("
        SELECT p.name, COALESCE(SUM(oi.qty), 0) AS qty
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id
            AND o.payment_status = 'paid'
            AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        WHERE p.is_active = 1
        GROUP BY p.id, p.name
        ORDER BY qty ASC
        LIMIT 3
    ");
    $slowStmt->execute([$days]);
    $slowForAI = array_map(fn($p) => ['nama' => $p['name'], 'terjual' => (int)$p['qty']], $slowStmt->fetchAll());

    // ── 4. Jam tersibuk ─────────────────────────────────────
    $peakStmt = $db->prepare("
        SELECT HOUR(created_at) AS hour, COUNT(*) AS orders
        FROM orders
        WHERE payment_status = 'paid'
          AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY HOUR(created_at)
        ORDER BY orders DESC
        LIMIT 3
    ");
    $peakStmt->execute([$days]);
    $peakForAI = array_map(fn($h) => sprintf('%02d:00', (int)$h['hour']), $peakStmt->fetchAll());

    // ── 5. Breakdown kategori ────────────────────────────────
    $catStmt = $db->prepare("
        SELECT p.category, SUM(oi.subtotal) AS revenue
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o   ON o.id = oi.order_id
        WHERE o.payment_status = 'paid'
          AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY p.category
        ORDER BY revenue DESC
    ");
    $catStmt->execute([$days]);
    $catForAI = array_map(fn($c) => [
        'kategori' => $c['category'],
        'revenue'  => (int)$c['revenue'],
        'persen'   => $revenue > 0 ? (int)round((float)$c['revenue'] / $revenue * 100) : 0,
    ], $catStmt->fetchAll());

    // ── 6. Stok ─────────────────────────────────────────────
    $stockEmpty = [];
    $stockLow   = [];
    if ($hasStock) {
        $r = $db->query("SELECT name FROM products WHERE stock = 0 AND is_active = 0");
        $stockEmpty = array_column($r->fetchAll(), 'name');

        $r2 = $db->prepare("SELECT name, stock FROM products WHERE stock IS NOT NULL AND stock > 0 AND stock <= 5 AND is_active = 1");
        $r2->execute();
        foreach ($r2->fetchAll() as $p) {
            $stockLow[] = "{$p['name']} (sisa {$p['stock']})";
        }
    }

    // ── Payload ke AI ────────────────────────────────────────
    $dateFrom    = date('d M Y', strtotime("-{$days} days"));
    $dateTo      = date('d M Y');
    $dataPayload = [
        'periode'            => "{$days} hari terakhir ({$dateFrom} – {$dateTo})",
        'ringkasan'          => array_filter([
            'revenue_total'          => (int)$revenue,
            'profit_total'           => $hasProfit ? (int)$profit : null,
            'margin_persen'          => $hasProfit ? $margin : null,
            'total_pesanan'          => $totalOrders,
            'pesanan_lunas'          => $ordersPaid,
            'conversion_rate_persen' => $convRate,
            'rata_rata_per_pesanan'  => $ordersPaid > 0 ? (int)round($revenue / $ordersPaid) : 0,
        ], fn($v) => $v !== null),
        'top_5_produk'       => $topForAI,
        'produk_paling_sepi' => $slowForAI,
        'jam_tersibuk'       => $peakForAI ?: ['tidak ada data'],
        'kategori'           => $catForAI,
    ];
    if (!empty($stockEmpty)) $dataPayload['stok_habis']  = $stockEmpty;
    if (!empty($stockLow))   $dataPayload['stok_rendah'] = $stockLow;

    $dataJson = json_encode($dataPayload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

    // ── Panggil AI ───────────────────────────────────────────
    $systemPrompt = <<<SYS
Kamu adalah konsultan bisnis restoran. Tugasmu bukan merangkum data — data sudah ada. Tugasmu adalah membuat KEPUTUSAN dan REKOMENDASI konkret berdasarkan data itu.

Aturan:
- Jangan ulangi angka yang sudah jelas dari data kecuali untuk mendukung argumen
- Setiap rekomendasi harus menjawab: APA yang dilakukan, KENAPA (dari data), dan DAMPAK yang diharapkan
- Gunakan bahasa langsung: "Hapus X", "Naikkan harga Y", "Tambah Z", bukan "Pertimbangkan untuk mungkin..."
- Jika ada produk yang tidak laku sama sekali, rekomendasikan dihapus atau diganti
- Jika ada produk yang terlalu laku, pertimbangkan apakah harganya terlalu murah
- Jika margin rendah, rekomendasikan penyesuaian harga atau efisiensi biaya
- Jika jam tertentu sepi, rekomendasikan aksi konkret (promo jam segitu, bundling, dll)

Format output (gunakan Markdown, ## untuk heading):

## Kondisi Sekarang
Satu paragraf singkat — hanya fakta paling penting yang perlu diketahui owner.

## Rekomendasi Aksi
Nomori setiap aksi. Minimal 3, maksimal 5. Format per aksi:
**[Aksi]** — alasan singkat dari data → dampak yang diharapkan.

## Yang Perlu Segera Ditangani
Masalah mendesak saja (stok habis, produk tidak terjual sama sekali, margin negatif). Lewati bagian ini jika tidak ada.
SYS;

    $aiPayload = json_encode([
        'model'       => 'openai/gpt-4o',
        'max_tokens'  => 2000,
        'temperature' => 0.4,
        'messages'    => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user',   'content' => "Data penjualan {$days} hari terakhir:\n\n```json\n{$dataJson}\n```"],
        ],
    ]);

    $ch = curl_init('https://lite.koboillm.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $aiPayload,
        CURLOPT_TIMEOUT        => 90,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
    ]);
    $response = curl_exec($ch);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        jsonResponse(['success' => false, 'message' => 'Gagal menghubungi AI: ' . $curlErr], 500);
    }

    $aiResult = json_decode($response, true);
    $insight  = $aiResult['choices'][0]['message']['content'] ?? null;

    if (!$insight) {
        $errMsg = $aiResult['error']['message'] ?? 'Respons AI tidak valid';
        jsonResponse(['success' => false, 'message' => $errMsg], 500);
    }

    // ── Simpan ke cache ──────────────────────────────────────
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }

    $cache = [
        'generated_at'      => date('Y-m-d H:i:s'),
        'generated_at_unix' => time(),
        'days'              => $days,
        'insight'           => $insight,
    ];
    file_put_contents($cacheFile, json_encode($cache, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    jsonResponse(['success' => true, 'cached' => true, 'data' => $cache]);
}

jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
