-- ============================================================
-- Migration: Tambah kolom is_notified + trigger otomatis
-- Jalankan: docker compose exec mysql mysql -uroot -proot123 restaurant_db < database/migration_notifications.sql
-- ============================================================

USE restaurant_db;

-- Tambah kolom is_notified ke tabel orders
ALTER TABLE `orders`
    ADD COLUMN `is_notified` TINYINT(1) NOT NULL DEFAULT 0
    AFTER `payment_status`;

-- Trigger: otomatis set is_notified = 1 saat payment_status berubah jadi 'paid'
-- Pakai BEFORE UPDATE agar bisa langsung modifikasi nilai NEW
DROP TRIGGER IF EXISTS trg_orders_paid_notify;

DELIMITER $$
CREATE TRIGGER trg_orders_paid_notify
BEFORE UPDATE ON `orders`
FOR EACH ROW
BEGIN
    IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
        SET NEW.is_notified = 1;
    END IF;
END$$
DELIMITER ;
