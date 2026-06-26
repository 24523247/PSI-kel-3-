-- ============================================================
-- Migration: Tambah cost_price snapshot ke order_items
-- Menyimpan HPP saat order dibuat agar kalkulasi profit historis akurat
-- Jalankan: docker compose exec mysql mysql -uroot -proot123 restaurant_db < database/migration_order_items_cost.sql
-- ============================================================

USE restaurant_db;

ALTER TABLE `order_items`
    ADD COLUMN `cost_price` DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER `price`;

-- Backfill order lama menggunakan HPP produk saat ini
-- (tidak 100% akurat tapi lebih baik dari 0)
UPDATE `order_items` oi
JOIN `products` p ON p.id = oi.product_id
SET oi.cost_price = p.cost_price
WHERE oi.cost_price = 0 AND p.cost_price > 0;
