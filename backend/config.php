<?php
// ============================================================
// config.php — Konfigurasi utama aplikasi
// Semua nilai sensitif dibaca dari file .env
// ============================================================

require_once __DIR__ . '/env.php';

// Muat file .env (letaknya satu folder dengan config.php)
loadEnv(__DIR__ . '/.env');

// --- Database ---
define('DB_HOST',    env('DB_HOST',    'mysql'));
define('DB_NAME',    env('DB_NAME',    'restaurant_db'));
define('DB_USER',    env('DB_USER',    'root'));
define('DB_PASS',    env('DB_PASS',    'root123'));
define('DB_CHARSET', 'utf8mb4');

// --- Midtrans ---
define('MIDTRANS_SERVER_KEY',    env('MIDTRANS_SERVER_KEY'));
define('MIDTRANS_CLIENT_KEY',    env('MIDTRANS_CLIENT_KEY'));
define('MIDTRANS_IS_PRODUCTION', env('MIDTRANS_IS_PRODUCTION', 'false') === 'true');

// --- KoboiLLM AI ---
define('KOBOI_API_KEY', env('KOBOI_API_KEY', ''));

// ============================================================
// Koneksi database (PDO)
// ============================================================
function getDB() {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Koneksi database gagal: ' . $e->getMessage()]);
            exit;
        }
    }

    return $pdo;
}

// ============================================================
// Helper: set header CORS & Content-Type JSON
// ============================================================
function setJsonHeaders() {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// ============================================================
// Helper: kirim response JSON
// ============================================================
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
