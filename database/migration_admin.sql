-- ============================================================
-- Migration: Admin Users Table
-- Jalankan sekali: docker compose exec mysql mysql -uroot -proot123 restaurant_db < database/migration_admin.sql
-- ============================================================

USE restaurant_db;

CREATE TABLE IF NOT EXISTS `admin_users` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `username`   VARCHAR(50) NOT NULL UNIQUE,
    `password`   VARCHAR(255) NOT NULL,
    `name`       VARCHAR(100) NOT NULL DEFAULT 'Administrator',
    `role`       ENUM('admin','superadmin') DEFAULT 'admin',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Akun default dibuat via seed.php (password di-hash PHP)
-- Akses: http://localhost:8080/backend/api/admin/seed.php
-- HAPUS seed.php setelah dipakai!
