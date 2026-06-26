<?php
// ============================================================
// middleware.php — Cek sesi untuk akses panel manajer
// Menggunakan sistem auth yang sama dengan admin (admin_users)
// ============================================================

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function requireManager() {
    if (empty($_SESSION['admin_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Silakan login terlebih dahulu.']);
        exit;
    }
    $role = $_SESSION['admin_role'] ?? '';
    if (!in_array($role, ['manager', 'admin', 'superadmin'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Akses ditolak.']);
        exit;
    }
}
