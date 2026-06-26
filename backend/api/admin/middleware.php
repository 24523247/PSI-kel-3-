<?php
// ============================================================
// middleware.php — Cek sesi admin sebelum akses API admin
// Include di setiap file backend/api/admin/*.php
// ============================================================

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function requireAdmin() {
    if (empty($_SESSION['admin_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Silakan login terlebih dahulu.']);
        exit;
    }
}
