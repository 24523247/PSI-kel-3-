# PRD — Restaurant QR Order System

## Tujuan Proyek
Sistem pemesanan restoran berbasis QR Code untuk keperluan **belajar** (bukan production).  
Alur: scan QR → lihat menu → pilih → bayar via Midtrans → lihat hasil.

---

## Stack

| Layer | Teknologi |
|---|---|
| Backend | PHP 8.2 vanilla (no framework) |
| Frontend | HTML + Vanilla JS + CSS |
| Database | MySQL 8.0 |
| Container | Docker Compose |
| Pembayaran | Midtrans Snap (mode Sandbox) |
| AI | KoboiLLM (OpenAI-compatible proxy → model `gemini-2.5-flash`) |

---

## Cara Menjalankan

```bash
docker compose up -d
```

| URL | Keterangan |
|---|---|
| http://localhost:8080/frontend/index.html | Halaman utama (simulasi QR) |
| http://localhost:8080/frontend/table.html?table=meja-1 | Menu Meja 1 |
| http://localhost:8081 | phpMyAdmin (root / root123) |

Edit file → save → refresh browser langsung tampak (bind mount, tidak perlu rebuild).

---

## Struktur File

```
restaurant-qr/
├── backend/
│   ├── .env                      ← API keys (git-ignored)
│   ├── .env.example
│   ├── config.php                ← Semua constant & helper (getDB, jsonResponse, setJsonHeaders)
│   ├── env.php                   ← Loader .env sederhana
│   ├── api/
│   │   ├── table.php             ← GET: info meja by code
│   │   ├── products.php          ← GET: semua produk aktif
│   │   ├── client-config.php     ← GET: midtrans_client_key untuk frontend
│   │   ├── create-order.php      ← POST: buat order + order_items (harga dari DB)
│   │   ├── create-payment.php    ← POST: snap_token via Midtrans SDK
│   │   ├── order-status.php      ← GET: status + detail order
│   │   ├── webhook.php           ← POST: callback Midtrans (verifikasi signature + update status)
│   │   └── ai-recommend.php      ← POST: rekomendasi AI via KoboiLLM
│   └── midtrans-sdk/             ← SDK Midtrans (tanpa Composer)
├── frontend/
│   ├── index.html                ← Simulator QR / daftar meja
│   ├── table.html                ← Halaman menu utama
│   ├── checkout.html             ← Halaman Midtrans SNAP embed
│   ├── payment-result.html       ← Halaman status pembayaran
│   ├── style.css                 ← Semua styling
│   └── image/                   ← Gambar produk (opsional)
├── database/
│   ├── init.sql                  ← Schema + seed data (auto-run pertama kali)
│   └── migration_add_columns.sql ← Untuk upgrade install lama
├── docker/
│   └── Dockerfile
└── docker-compose.yml
```

---

## Environment Variables (`backend/.env`)

```env
DB_HOST=mysql
DB_NAME=restaurant_db
DB_USER=root
DB_PASS=root123

MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
MIDTRANS_IS_PRODUCTION=false

KOBOI_API_KEY=sk-xxxxx
```

---

## Database Schema

### `tables` — Data meja restoran
| Kolom | Tipe |
|---|---|
| id | INT PK |
| table_code | VARCHAR(50) UNIQUE — contoh: `meja-1` |
| table_name | VARCHAR(100) — contoh: `Meja 1` |

Seed: meja-1, meja-2, meja-3

### `products` — Menu
| Kolom | Tipe |
|---|---|
| id | INT PK |
| name | VARCHAR(150) |
| price | DECIMAL(10,2) — Rupiah |
| category | VARCHAR(50) — `makanan` atau `minuman` |
| description | TEXT — opsional |
| image_url | VARCHAR(500) — opsional, fallback ke emoji gradient |
| is_active | TINYINT(1) |

Seed: 6 makanan + 5 minuman

### `orders` — Header pesanan
| Kolom | Tipe |
|---|---|
| id | INT PK |
| order_code | VARCHAR(50) UNIQUE — format `ORD-YYYYMMDD-XXXXXX` |
| table_id | INT FK → tables.id |
| total_amount | DECIMAL(10,2) |
| payment_status | ENUM(`pending`, `paid`, `failed`, `cancelled`) |
| snap_token | VARCHAR(255) — dari Midtrans |

### `order_items` — Detail item dalam pesanan
| Kolom | Tipe |
|---|---|
| order_id | INT FK → orders.id |
| product_id | INT FK → products.id |
| qty | INT |
| price | DECIMAL(10,2) — snapshot harga saat pesan |
| subtotal | DECIMAL(10,2) — price × qty |

### `payment_logs` — Log callback Midtrans
| Kolom | Tipe |
|---|---|
| order_id | INT |
| order_code | VARCHAR(50) |
| gateway_response | TEXT — raw JSON dari Midtrans |

---

## API Endpoints

| Method | Path | Keterangan |
|---|---|---|
| GET | `/backend/api/table.php?code=meja-1` | Validasi meja |
| GET | `/backend/api/products.php` | Semua produk aktif |
| GET | `/backend/api/client-config.php` | Midtrans client key |
| POST | `/backend/api/create-order.php` | Buat order baru |
| POST | `/backend/api/create-payment.php` | Dapatkan snap_token |
| GET | `/backend/api/order-status.php?code=ORD-...` | Status + detail order |
| POST | `/backend/api/webhook.php` | Callback dari Midtrans |
| POST | `/backend/api/ai-recommend.php` | Rekomendasi AI |

### POST `/backend/api/create-order.php`
```json
// Request
{ "table_code": "meja-1", "items": [{ "product_id": 1, "qty": 2 }] }

// Response
{ "success": true, "data": { "order_id": 1, "order_code": "ORD-20260619-ABC123", "total_amount": 50000 } }
```

### POST `/backend/api/ai-recommend.php`
```json
// Request
{ "preference": "Mau yang pedas dan mengenyangkan" }

// Response
{ "success": true, "data": [{ "id": 1, "name": "Nasi Goreng Spesial", "price": 25000, "category": "makanan", "reason": "Nasi goreng pedas yang mengenyangkan dengan telur dan ayam" }] }
```

---

## Alur Pemesanan

```
scan QR → table.html?table=meja-X
  → GET /api/table.php         (validasi meja)
  → GET /api/products.php      (load menu)
  → [opsional] POST /api/ai-recommend.php
  → user pilih menu → klik "Pesan & Bayar"
  → POST /api/create-order.php  → dapat order_code
  → POST /api/create-payment.php → dapat snap_token
  → simpan ke sessionStorage → redirect checkout.html
  → snap.embed(token) + polling 3 detik
  → Midtrans webhook → POST /api/webhook.php → update DB
  → polling detect paid → redirect payment-result.html
  → tampil status + detail + polling 5 detik jika pending
```

---

## Integrasi Midtrans

- Mode Sandbox (`MIDTRANS_IS_PRODUCTION=false`)
- `checkout.html` pakai `snap.embed()` bukan popup, dengan MutationObserver force `width:100%` pada iframe Midtrans
- Polling setiap 3 detik sebagai backup karena `onSuccess` callback embed tidak selalu fire di sandbox (terutama QRIS — async di HP lain)
- Kartu test: `4811 1111 1111 1114`, CVV `123`, OTP `112233`
- Webhook butuh URL publik → pakai `cloudflared tunnel --url http://localhost:8080`

---

## Integrasi KoboiLLM (AI)

- Endpoint: `https://lite.koboillm.com/v1/chat/completions` (OpenAI-compatible)
- Model: `gemini-2.5-flash`
- **WAJIB** `max_tokens: 2000` — model thinking, ~400 token dikonsumsi internal. Jika terlalu kecil → `finish_reason: length` → JSON terpotong → error
- Output selalu dibungkus markdown code fence (` ```json ... ``` `) meskipun dilarang. Solusi: `strpos($text, '[')` + `strrpos($text, ']')` untuk extract array

---

## Aturan Penting

| Aturan | Alasan |
|---|---|
| Jangan ubah `create-payment.php`, `webhook.php`, `order-status.php` | Payment flow sudah berjalan dan verified |
| Harga selalu diambil dari DB di `create-order.php` | Keamanan — jangan percaya harga dari client |
| Verifikasi signature di `webhook.php` jangan di-bypass | Keamanan — cegah fake webhook |
| `sessionStorage` keys: `snap_token` & `snap_client_key` | Dipakai oleh `checkout.html`, jangan ganti nama |

---

## Docker

| Service | Container | Port |
|---|---|---|
| PHP + Apache | restaurant_app | 8080 |
| MySQL 8 | restaurant_mysql | 3306 |
| phpMyAdmin | restaurant_phpmyadmin | 8081 |

```bash
docker compose up -d        # jalankan
docker compose down         # matikan
docker compose logs -f app  # lihat log PHP/Apache
docker compose down -v      # reset total (hapus data MySQL)
```

---

## Quirks & Gotchas

- `DB_HOST` harus `mysql` (nama service Docker), bukan `localhost`
- MySQL butuh ~10 detik pertama kali sebelum siap
- Webhook tidak bisa hit `localhost` → wajib cloudflared saat testing webhook
- `snap.embed()` di sandbox tidak reliable untuk QRIS → polling adalah solusi utama
- `gemini-2.5-flash` selalu wrap JSON dalam code fence → harus di-strip manual
