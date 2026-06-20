<?php
// ============================================================
// API: GET /api/client-config.php
// Mengembalikan konfigurasi yang AMAN untuk frontend.
//
// Kenapa file ini ada?
// - Client Key Midtrans memang boleh ada di frontend
// - Tapi lebih rapi jika dibaca dari satu tempat (config.php)
//   daripada hardcode di HTML
// - Server Key TIDAK pernah dikirim ke sini
// ============================================================

require_once __DIR__ . '/../config.php';

setJsonHeaders();

jsonResponse([
    'success'            => true,
    'midtrans_client_key' => MIDTRANS_CLIENT_KEY,
    'is_production'      => MIDTRANS_IS_PRODUCTION,
]);
