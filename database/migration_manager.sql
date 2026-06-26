-- ============================================================
-- Migration: Fitur Dashboard Manajer
-- Jalankan sekali:
-- docker compose exec mysql mysql -uroot -proot123 restaurant_db < database/migration_manager.sql
-- ============================================================

USE restaurant_db;

-- Harga Pokok Produk (HPP/COGS) untuk kalkulasi profit & margin
-- stock NULL = tidak tracking stok, angka = ada batas
ALTER TABLE `products`
    ADD COLUMN `cost_price` DECIMAL(10,2) NOT NULL DEFAULT 0     AFTER `price`,
    ADD COLUMN `stock`      INT           DEFAULT NULL            AFTER `is_active`;

-- Timestamp terakhir update order (untuk durasi pembayaran di masa depan)
ALTER TABLE `orders`
    ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP           AFTER `created_at`;

-- Tambah role manager ke tabel admin_users
ALTER TABLE `admin_users`
    MODIFY COLUMN `role` ENUM('admin','superadmin','manager') DEFAULT 'admin';
