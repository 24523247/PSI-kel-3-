# PRD — Restaurant QR Order System

## Tujuan Proyek
Sistem pemesanan restoran berbasis QR Code untuk keperluan **belajar** (bukan production).  
Alur: scan QR → lihat menu → pilih → bayar via Midtrans → lihat hasil.  
Dilengkapi **panel admin** untuk manajemen menu, laporan pesanan, notifikasi dapur, dan pengelolaan menu berbasis AI.

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
| http://localhost:8080/frontend/admin/login.html | Login panel admin |
| http://localhost:8081 | phpMyAdmin (root / root123) |

Edit file → save → refresh browser langsung tampak (bind mount, tidak perlu rebuild).

---

## Struktur File

```
PSI-kel-3-/
├── backend/
│   ├── .env                       ← API keys (git-ignored)
│   ├── .env.example
│   ├── config.php                 ← Semua constant & helper (getDB, jsonResponse, setJsonHeaders)
│   ├── env.php                    ← Loader .env sederhana
│   ├── api/
│   │   ├── table.php              ← GET: info meja by code
│   │   ├── products.php           ← GET: semua produk aktif
│   │   ├── client-config.php      ← GET: midtrans_client_key untuk frontend
│   │   ├── create-order.php       ← POST: buat order + order_items (harga dari DB)
│   │   ├── create-payment.php     ← POST: snap_token via Midtrans SDK
│   │   ├── order-status.php       ← GET: status + detail order
│   │   ├── webhook.php            ← POST: callback Midtrans (verifikasi signature + update status)
│   │   ├── ai-recommend.php       ← POST: rekomendasi AI via KoboiLLM
│   │   └── admin/
│   │       ├── middleware.php     ← Session guard requireAdmin()
│   │       ├── auth.php           ← POST login / DELETE logout admin
│   │       ├── stats.php          ← GET: statistik dashboard
│   │       ├── menu.php           ← GET/POST/PUT/DELETE menu (soft delete)
│   │       ├── orders.php         ← GET: daftar pesanan + pagination + summary
│   │       ├── order-detail.php   ← GET: detail pesanan + item
│   │       ├── notifications.php  ← GET/PATCH: notifikasi dapur (is_notified)
│   │       ├── ai-menu-helpers.php← validateAISQL() — whitelist & blacklist SQL
│   │       ├── ai-menu-parse.php  ← POST: NL → intent + SQL (AI, rate-limited)
│   │       ├── ai-menu-confirm.php← POST: eksekusi SQL yang dikonfirmasi admin
│   │       └── ai-menu-history.php← GET: riwayat ai_menu_logs
│   └── midtrans-sdk/              ← SDK Midtrans (tanpa Composer)
├── frontend/
│   ├── index.html                 ← Simulator QR / daftar meja
│   ├── table.html                 ← Halaman menu utama
│   ├── checkout.html              ← Halaman Midtrans SNAP embed
│   ├── payment-result.html        ← Halaman status pembayaran
│   ├── css/style.css
│   ├── js/
│   │   ├── index.js
│   │   ├── checkout.js
│   │   ├── payment-result.js
│   │   └── table.js
│   ├── image/                     ← Gambar produk
│   └── admin/
│       ├── login.html
│       ├── dashboard.html
│       ├── kelola-menu.html
│       ├── detail-menu.html
│       ├── kategori.html
│       ├── galeri.html
│       ├── laporan.html
│       ├── notifikasi.html
│       ├── ai-menu.html
│       ├── pengaturan.html
│       ├── css/admin.css
│       └── js/
│           ├── auth.js            ← Session check + sidebar user info + logout
│           ├── kelola-menu.js
│           ├── detail-menu.js
│           ├── laporan.js
│           ├── notifikasi.js
│           └── ai-menu.js
├── database/
│   ├── init.sql                   ← Schema + seed data (auto-run pertama kali)
│   ├── migration_add_columns.sql  ← Upgrade install lama
│   ├── migration_admin.sql        ← Tabel admin_users
│   ├── migration_notifications.sql← Kolom is_notified + TRIGGER
│   ├── migration_ai_menu_logs.sql ← Tabel ai_menu_logs
│   └── migration_payment_logs_order_id.sql ← Backfill order_id di payment_logs
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
| is_active | TINYINT(1) — soft delete |

Seed: 6 makanan + 5 minuman

### `orders` — Header pesanan
| Kolom | Tipe |
|---|---|
| id | INT PK |
| order_code | VARCHAR(50) UNIQUE — format `ORD-YYYYMMDD-XXXXXX` |
| table_id | INT FK → tables.id |
| total_amount | DECIMAL(10,2) |
| payment_status | ENUM(`pending`, `paid`, `failed`, `cancelled`) |
| is_notified | TINYINT(1) DEFAULT 0 — diisi otomatis oleh TRIGGER saat status → `paid` |
| snap_token | VARCHAR(255) — dari Midtrans |
| created_at | TIMESTAMP |

> TRIGGER `trg_orders_paid_notify`: BEFORE UPDATE, otomatis set `is_notified = 1` saat `payment_status` berubah ke `'paid'`.

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
| order_id | INT — FK opsional, di-backfill via migration |
| order_code | VARCHAR(50) |
| gateway_response | TEXT — raw JSON dari Midtrans |

### `admin_users` — Akun admin panel
| Kolom | Tipe |
|---|---|
| id | INT PK |
| username | VARCHAR(50) UNIQUE |
| password | VARCHAR(255) — bcrypt hash |
| name | VARCHAR(100) |
| role | ENUM(`admin`, `superadmin`) |
| created_at | TIMESTAMP |

> Setup: jalankan `migration_admin.sql`, lalu akses `/backend/api/admin/seed.php` satu kali untuk membuat akun default. Hapus `seed.php` setelah dipakai.

### `ai_menu_logs` — Audit log perintah AI
| Kolom | Tipe |
|---|---|
| id | INT PK |
| admin_id | INT — ID admin yang memberi perintah |
| prompt | TEXT — perintah natural language asli |
| intent | VARCHAR(50) — `CREATE_MENU`, `READ_MENU`, `UPDATE_MENU`, `DELETE_MENU`, `UNKNOWN` |
| generated_sql | TEXT — SQL yang dihasilkan AI (dengan `?` placeholder) |
| params | TEXT — JSON array nilai parameter |
| status | ENUM(`pending`, `executed`, `cancelled`, `failed`) |
| result_message | TEXT — ringkasan hasil eksekusi |
| created_at | TIMESTAMP |

---

## API Endpoints

### Client (frontend pelanggan)

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

### Admin (session wajib, dijaga `requireAdmin()`)

| Method | Path | Keterangan |
|---|---|---|
| POST | `/backend/api/admin/auth.php` | Login admin |
| DELETE | `/backend/api/admin/auth.php` | Logout admin |
| GET | `/backend/api/admin/stats.php` | Statistik dashboard |
| GET/POST/PUT/DELETE | `/backend/api/admin/menu.php` | CRUD menu (soft delete) |
| GET | `/backend/api/admin/orders.php` | Daftar pesanan + summary |
| GET | `/backend/api/admin/order-detail.php?code=ORD-...` | Detail pesanan + items |
| GET | `/backend/api/admin/notifications.php` | Notifikasi dapur (is_notified=1) |
| PATCH | `/backend/api/admin/notifications.php` | Dismiss notifikasi |
| POST | `/backend/api/admin/ai-menu-parse.php` | NL → intent + SQL |
| POST | `/backend/api/admin/ai-menu-confirm.php` | Eksekusi / batalkan SQL |
| GET | `/backend/api/admin/ai-menu-history.php` | Riwayat perintah AI |

---

## Alur Pemesanan (Client)

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
  → Midtrans webhook → POST /api/webhook.php → update DB + TRIGGER set is_notified
  → polling detect paid → redirect payment-result.html
  → tampil status + detail + polling 5 detik jika pending
```

---

## Alur Panel Admin

```
/frontend/admin/login.html
  → POST /api/admin/auth.php    (bcrypt verify, set $_SESSION)
  → dashboard.html              (GET /api/admin/stats.php)
  → kelola-menu.html            (GET/POST/PUT/DELETE /api/admin/menu.php)
  → laporan.html                (GET /api/admin/orders.php, GET /api/admin/order-detail.php)
  → notifikasi.html             (polling GET /api/admin/notifications.php setiap 10 detik)
  → ai-menu.html                (AI CRUD Menu — lihat seksi AI di bawah)
```

---

## Fitur AI CRUD Menu

Multi-step agent: perintah bahasa natural → preview SQL → konfirmasi admin → eksekusi.

### Arsitektur keamanan

```
Admin ketik perintah
        ↓
POST /ai-menu-parse.php
  ├─ Rate limit: 15 req / 5 menit / sesi
  ├─ Kirim ke KoboiLLM (temperature=0.1, max_tokens=2000)
  ├─ Strip markdown fence dari respons
  ├─ validateAISQL() — whitelist + blacklist
  └─ Simpan ke ai_menu_logs status='pending'
        ↓
  [SELECT] → auto-eksekusi tanpa konfirmasi
  [CREATE/UPDATE/DELETE] → tampilkan preview SQL ke admin
        ↓
Admin klik "Konfirmasi Eksekusi"
POST /ai-menu-confirm.php
  ├─ Ambil log WHERE id=? AND admin_id=? AND status='pending'
  ├─ Re-validasi SQL (defense in depth)
  ├─ Eksekusi dalam transaksi PDO
  └─ Update log status='executed'/'cancelled'/'failed'
```

### Validasi SQL (`ai-menu-helpers.php`)

- **Whitelist tabel**: hanya `products`
- **Whitelist operasi**: `SELECT`, `INSERT INTO products`, `UPDATE products`
- **Blacklist keyword**: `DROP`, `TRUNCATE`, `ALTER`, `DELETE FROM`, `UNION`, `INFORMATION_SCHEMA`, `SLEEP(`, `BENCHMARK(`, `--`, `/*`
- **Blacklist kolom**: `password`, `snap_token`, `gateway_response`
- **DELETE** selalu diubah AI menjadi `UPDATE products SET is_active = 0`

### Persistensi Chat

Chat direkonstruksi dari `ai_menu_logs` saat halaman dimuat — tidak perlu `localStorage`. Pending item yang belum dikonfirmasi ditampilkan ulang dengan tombol konfirmasi aktif. Log panel kanan bisa diklik untuk scroll ke pesan terkait di chat.

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
- Output selalu dibungkus markdown code fence (` ```json ... ``` `) meskipun dilarang. Solusi: `strpos($text, '{')` + `strrpos($text, '}')` untuk extract JSON object
- `temperature: 0.1` untuk SQL deterministik

---

## Aturan Penting

| Aturan | Alasan |
|---|---|
| Jangan ubah `create-payment.php`, `webhook.php`, `order-status.php` | Payment flow sudah berjalan dan verified |
| Harga selalu diambil dari DB di `create-order.php` | Keamanan — jangan percaya harga dari client |
| Verifikasi signature di `webhook.php` jangan di-bypass | Keamanan — cegah fake webhook |
| `sessionStorage` keys: `snap_token` & `snap_client_key` | Dipakai oleh `checkout.html`, jangan ganti nama |
| AI tidak pernah langsung eksekusi SQL | Selalu melalui 2 tahap validasi + konfirmasi admin |
| Soft delete: `UPDATE products SET is_active = 0` | FK constraint — tidak boleh `DELETE FROM products` |

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
- Dalam string PHP double-quoted, `` \` `` bukan escape sequence yang valid → tulis `` ` `` langsung (relevan saat query melibatkan tabel `tables`)
- phpMyAdmin default menampilkan 25 baris per halaman — bukan limit database
