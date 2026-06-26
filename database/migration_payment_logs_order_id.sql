-- Backfill payment_logs.order_id dari order_code yang sudah ada di tabel orders
-- Jalankan sekali saja setelah deploy

UPDATE payment_logs pl
JOIN orders o ON o.order_code = pl.order_code
SET pl.order_id = o.id
WHERE pl.order_id IS NULL
  AND pl.order_code IS NOT NULL;
