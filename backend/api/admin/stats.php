<?php
// ============================================================
// API: GET /backend/api/admin/stats.php
// Statistik untuk dashboard admin
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';

setJsonHeaders();
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$db = getDB();

// Total & aktif produk
$r = $db->query('SELECT COUNT(*) AS total, SUM(is_active = 1) AS aktif FROM products')->fetch();
$totalMenu  = (int)$r['total'];
$menuAktif  = (int)$r['aktif'];

// Total kategori unik
$r = $db->query('SELECT COUNT(DISTINCT category) AS total FROM products')->fetch();
$totalKategori = (int)$r['total'];

// Total gambar terupload (image_url tidak null)
$r = $db->query("SELECT COUNT(*) AS total FROM products WHERE image_url IS NOT NULL AND image_url != ''")->fetch();
$totalGambar = (int)$r['total'];

// Total pesanan
$r = $db->query('SELECT COUNT(*) AS total FROM orders')->fetch();
$totalPesanan = (int)$r['total'];

// Pesanan paid
$r = $db->query("SELECT COUNT(*) AS total FROM orders WHERE payment_status = 'paid'")->fetch();
$pesananPaid = (int)$r['total'];

// Total revenue (paid orders)
$r = $db->query("SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE payment_status = 'paid'")->fetch();
$totalRevenue = (int)$r['total'];

// Pesanan hari ini
$r = $db->query("SELECT COUNT(*) AS total FROM orders WHERE DATE(created_at) = CURDATE()")->fetch();
$pesananHariIni = (int)$r['total'];

// Menu ditambah bulan ini
$r = $db->query("SELECT COUNT(*) AS total FROM products WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())")->fetch();
$menuBulanIni = (int)$r['total'];

jsonResponse([
    'success' => true,
    'data' => [
        'total_menu'       => $totalMenu,
        'menu_aktif'       => $menuAktif,
        'menu_nonaktif'    => $totalMenu - $menuAktif,
        'total_kategori'   => $totalKategori,
        'total_gambar'     => $totalGambar,
        'total_pesanan'    => $totalPesanan,
        'pesanan_paid'     => $pesananPaid,
        'total_revenue'    => $totalRevenue,
        'pesanan_hari_ini' => $pesananHariIni,
        'menu_bulan_ini'   => $menuBulanIni,
    ]
]);
