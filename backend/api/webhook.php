<?php
// ============================================================
// API: POST /api/webhook.php
// Menerima notifikasi pembayaran dari Midtrans
//
// Cara kerja webhook:
// 1. Setelah user bayar, Midtrans otomatis mengirim HTTP POST ke URL ini
// 2. Kita verifikasi signature key agar tidak bisa dipalsukan
// 3. Kita update status order sesuai status dari Midtrans
//
// Status Midtrans yang perlu dihandle:
// - capture     = berhasil (kartu kredit)
// - settlement  = berhasil (transfer, QRIS, dll)
// - pending     = menunggu pembayaran
// - deny        = ditolak
// - expire      = kedaluwarsa
// - cancel      = dibatalkan
// ============================================================

require_once __DIR__ . '/../config.php';

setJsonHeaders();

// Baca notifikasi dari Midtrans
$body = file_get_contents('php://input');
$data = json_decode($body, true);

if (!$data) {
    jsonResponse(['success' => false, 'message' => 'Body tidak valid'], 400);
}

$orderCode         = $data['order_id']          ?? '';
$transactionStatus = $data['transaction_status'] ?? '';
$fraudStatus       = $data['fraud_status']       ?? '';
$signatureKey      = $data['signature_key']      ?? '';
$statusCode        = $data['status_code']        ?? '';
$grossAmount       = $data['gross_amount']       ?? '';

// ============================================================
// Verifikasi Signature Key
// Midtrans mengirim signature_key untuk membuktikan keaslian notifikasi.
// Rumus: SHA512(order_id + status_code + gross_amount + server_key)
// ============================================================
$expectedSignature = hash('sha512', $orderCode . $statusCode . $grossAmount . MIDTRANS_SERVER_KEY);

if ($signatureKey !== $expectedSignature) {
    // Log percobaan tidak sah
    error_log("Webhook: signature tidak cocok untuk order $orderCode");
    jsonResponse(['success' => false, 'message' => 'Signature tidak valid'], 403);
}

// ============================================================
// Tentukan status pembayaran berdasarkan status Midtrans
// ============================================================
$paymentStatus = 'pending'; // default

if ($transactionStatus === 'capture') {
    // Kartu kredit: cek fraud status
    if ($fraudStatus === 'accept') {
        $paymentStatus = 'paid';
    } else {
        $paymentStatus = 'failed';
    }
} elseif ($transactionStatus === 'settlement') {
    // Transfer bank, QRIS, e-wallet, dll
    $paymentStatus = 'paid';
} elseif (in_array($transactionStatus, ['cancel', 'deny', 'expire'])) {
    $paymentStatus = 'failed';
} elseif ($transactionStatus === 'pending') {
    $paymentStatus = 'pending';
}

$db = getDB();

// ============================================================
// Catat semua webhook ke payment_logs (untuk debugging)
// ============================================================
$stmt = $db->prepare('
    INSERT INTO payment_logs (order_code, gateway_response)
    VALUES (?, ?)
');
$stmt->execute([$orderCode, $body]);

// ============================================================
// Update status order di database
// ============================================================
$stmt = $db->prepare('
    UPDATE orders
    SET payment_status = ?
    WHERE order_code = ?
');
$stmt->execute([$paymentStatus, $orderCode]);

if ($stmt->rowCount() === 0) {
    // Order tidak ditemukan, tapi tetap balas OK agar Midtrans tidak retry terus
    error_log("Webhook: order $orderCode tidak ditemukan");
}

// Midtrans butuh response 200 OK
jsonResponse([
    'success'        => true,
    'message'        => 'Webhook diterima',
    'order_code'     => $orderCode,
    'payment_status' => $paymentStatus,
]);
