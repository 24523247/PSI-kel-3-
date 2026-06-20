-- ============================================================
-- Restaurant QR Order System - Database Init
-- ============================================================

CREATE DATABASE IF NOT EXISTS restaurant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurant_db;

-- ============================================================
-- Tabel: tables (data meja restoran)
-- ============================================================
CREATE TABLE IF NOT EXISTS `tables` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `table_code` VARCHAR(50) NOT NULL UNIQUE,
    `table_name` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Tabel: products (menu makanan/minuman)
-- ============================================================
CREATE TABLE IF NOT EXISTS `products` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `name`        VARCHAR(150) NOT NULL,
    `price`       DECIMAL(10,2) NOT NULL,
    `category`    VARCHAR(50) DEFAULT 'makanan',
    `description` TEXT DEFAULT NULL,
    `image_url`   VARCHAR(500) DEFAULT NULL,
    `is_active`   TINYINT(1) DEFAULT 1,
    `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Tabel: orders (header pesanan)
-- ============================================================
CREATE TABLE IF NOT EXISTS `orders` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `order_code`     VARCHAR(50) NOT NULL UNIQUE,
    `table_id`       INT NOT NULL,
    `total_amount`   DECIMAL(10,2) NOT NULL DEFAULT 0,
    `payment_status` ENUM('pending','paid','failed','cancelled') DEFAULT 'pending',
    `snap_token`     VARCHAR(255) DEFAULT NULL,
    `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`)
) ENGINE=InnoDB;

-- ============================================================
-- Tabel: order_items (detail item dalam pesanan)
-- ============================================================
CREATE TABLE IF NOT EXISTS `order_items` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `order_id`   INT NOT NULL,
    `product_id` INT NOT NULL,
    `qty`        INT NOT NULL DEFAULT 1,
    `price`      DECIMAL(10,2) NOT NULL,
    `subtotal`   DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (`order_id`)   REFERENCES `orders`(`id`),
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB;

-- ============================================================
-- Tabel: payment_logs (log callback dari Midtrans)
-- ============================================================
CREATE TABLE IF NOT EXISTS `payment_logs` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `order_id`         INT DEFAULT NULL,
    `order_code`       VARCHAR(50) DEFAULT NULL,
    `gateway_response` TEXT,
    `created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- DATA: Meja
-- ============================================================
INSERT INTO `tables` (`table_code`, `table_name`) VALUES
('meja-1', 'Meja 1'),
('meja-2', 'Meja 2'),
('meja-3', 'Meja 3');

-- ============================================================
-- DATA: Menu Makanan & Minuman
-- ============================================================
INSERT INTO `products` (`name`, `price`, `category`, `description`) VALUES
-- Makanan
('Nasi Goreng Spesial', 25000, 'makanan', 'Nasi goreng wangi dengan telur mata sapi, ayam suwir, dan kerupuk renyah'),
('Mie Goreng Bakso',    22000, 'makanan', 'Mie goreng lezat dengan bakso sapi pilihan dan sayuran segar'),
('Ayam Bakar Madu',     35000, 'makanan', 'Ayam bakar marinasi madu spesial, disajikan dengan lalapan dan sambal'),
('Soto Ayam',           20000, 'makanan', 'Soto ayam bening segar dengan suwiran ayam, bihun, dan telur rebus'),
('Gado-Gado',           18000, 'makanan', 'Sayuran rebus segar dengan saus kacang kental pilihan dan kerupuk'),
('Nasi Uduk Komplit',   28000, 'makanan', 'Nasi uduk gurih lengkap dengan ayam goreng, tempe, tahu, dan sambal'),
-- Minuman
('Es Teh Manis',  5000,  'minuman', 'Teh manis segar diseduh panas lalu dinginkan dengan es batu kristal'),
('Es Jeruk',      7000,  'minuman', 'Jeruk peras asli, manis-asam menyegarkan dengan es batu'),
('Jus Alpukat',   15000, 'minuman', 'Jus alpukat kental creamy dengan susu coklat dan gula aren'),
('Kopi Hitam',    8000,  'minuman', 'Kopi robusta pilihan diseduh langsung, aroma kuat rasa nikmat'),
('Air Mineral',   4000,  'minuman', 'Air mineral dingin dalam botol 600ml');
