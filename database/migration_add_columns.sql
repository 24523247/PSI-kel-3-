-- ============================================================
-- Migration: tambah kolom description dan image_url ke products
-- Jalankan sekali jika database sudah ada (bukan fresh install)
-- ============================================================

ALTER TABLE `products`
    ADD COLUMN IF NOT EXISTS `description` TEXT DEFAULT NULL AFTER `category`,
    ADD COLUMN IF NOT EXISTS `image_url`   VARCHAR(500) DEFAULT NULL AFTER `description`;

-- Update deskripsi untuk data seed yang sudah ada
UPDATE `products` SET `description` = 'Nasi goreng wangi dengan telur mata sapi, ayam suwir, dan kerupuk renyah'         WHERE `name` = 'Nasi Goreng Spesial';
UPDATE `products` SET `description` = 'Mie goreng lezat dengan bakso sapi pilihan dan sayuran segar'                       WHERE `name` = 'Mie Goreng Bakso';
UPDATE `products` SET `description` = 'Ayam bakar marinasi madu spesial, disajikan dengan lalapan dan sambal'              WHERE `name` = 'Ayam Bakar Madu';
UPDATE `products` SET `description` = 'Soto ayam bening segar dengan suwiran ayam, bihun, dan telur rebus'                 WHERE `name` = 'Soto Ayam';
UPDATE `products` SET `description` = 'Sayuran rebus segar dengan saus kacang kental pilihan dan kerupuk'                  WHERE `name` = 'Gado-Gado';
UPDATE `products` SET `description` = 'Nasi uduk gurih lengkap dengan ayam goreng, tempe, tahu, dan sambal'                WHERE `name` = 'Nasi Uduk Komplit';
UPDATE `products` SET `description` = 'Teh manis segar diseduh panas lalu dinginkan dengan es batu kristal'               WHERE `name` = 'Es Teh Manis';
UPDATE `products` SET `description` = 'Jeruk peras asli, manis-asam menyegarkan dengan es batu'                            WHERE `name` = 'Es Jeruk';
UPDATE `products` SET `description` = 'Jus alpukat kental creamy dengan susu coklat dan gula aren'                        WHERE `name` = 'Jus Alpukat';
UPDATE `products` SET `description` = 'Kopi robusta pilihan diseduh langsung, aroma kuat rasa nikmat'                     WHERE `name` = 'Kopi Hitam';
UPDATE `products` SET `description` = 'Air mineral dingin dalam botol 600ml'                                               WHERE `name` = 'Air Mineral';
