<?php
// ============================================================
// API: /backend/api/admin/auth.php
// GET  ?action=check  → cek status login
// POST               → login { username, password }
// DELETE             → logout
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';

setJsonHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Cek status sesi ──────────────────────────────────────────
if ($method === 'GET') {
    if (!empty($_SESSION['admin_id'])) {
        jsonResponse([
            'success' => true,
            'user' => [
                'id'       => $_SESSION['admin_id'],
                'name'     => $_SESSION['admin_name'],
                'username' => $_SESSION['admin_username'],
                'role'     => $_SESSION['admin_role'],
            ]
        ]);
    }
    jsonResponse(['success' => false, 'message' => 'Belum login'], 401);
}

// ── Login ────────────────────────────────────────────────────
if ($method === 'POST') {
    $body     = json_decode(file_get_contents('php://input'), true);
    $username = trim($body['username'] ?? '');
    $password = trim($body['password'] ?? '');

    if (empty($username) || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'Username dan password wajib diisi'], 400);
    }

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM admin_users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        jsonResponse(['success' => false, 'message' => 'Username atau password salah'], 401);
    }

    $_SESSION['admin_id']       = $user['id'];
    $_SESSION['admin_name']     = $user['name'];
    $_SESSION['admin_username'] = $user['username'];
    $_SESSION['admin_role']     = $user['role'];

    jsonResponse([
        'success' => true,
        'message' => 'Login berhasil',
        'user'    => [
            'id'   => $user['id'],
            'name' => $user['name'],
            'role' => $user['role'],
        ]
    ]);
}

// ── Logout ───────────────────────────────────────────────────
if ($method === 'DELETE') {
    session_unset();
    session_destroy();
    jsonResponse(['success' => true, 'message' => 'Logout berhasil']);
}

jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
