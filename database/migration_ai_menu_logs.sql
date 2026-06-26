-- ============================================================
-- Migration: Audit log untuk AI CRUD Menu
-- Jalankan: docker compose exec mysql mysql -uroot -proot123 restaurant_db < database/migration_ai_menu_logs.sql
-- ============================================================

USE restaurant_db;

CREATE TABLE IF NOT EXISTS `ai_menu_logs` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `admin_id`       INT NOT NULL,
    `prompt`         TEXT NOT NULL,
    `intent`         VARCHAR(50) DEFAULT NULL,
    `generated_sql`  TEXT DEFAULT NULL,
    `params`         TEXT DEFAULT NULL,
    `status`         ENUM('pending','executed','cancelled','failed') DEFAULT 'pending',
    `result_message` TEXT DEFAULT NULL,
    `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
