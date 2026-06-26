# Restaurant QR Order System

Sistem pemesanan restoran berbasis QR Code menggunakan **PHP Vanilla**, **MySQL**, dan **Midtrans Sandbox**, dilengkapi **panel admin** dengan fitur AI CRUD Menu berbasis bahasa natural.

Project ini dibuat untuk **belajar**, bukan production. Fokus pada:
- Alur pemesanan dari scan QR sampai pembayaran
- Cara kerja REST API sederhana dengan PHP
- Integrasi Midtrans Snap tanpa Composer
- Panel admin dengan manajemen menu, laporan, dan notifikasi dapur
- AI agent untuk CRUD menu menggunakan bahasa natural (KoboiLLM)
- Docker untuk development environment

---

## Struktur Folder

```
PSI-kel-3-/
├── backend/
│   ├── api/
│   │   ├── table.php              ← GET: info meja
│   │   ├── products.php           ← GET: daftar menu aktif
│   │   ├── create-order.php       ← POST: buat pesanan
│   │   ├── create-payment.php     ← POST: buat transaksi Midtrans
│   │   ├── order-status.php       ← GET: cek status pesanan
│   │   ├── webhook.php            ← POST: callback dari Midtrans
│   │   ├── ai-recommend.php       ← POST: rekomendasi AI
│   │   └── admin/
│   │       ├── middleware.php     ← Session guard admin
│   │       ├── auth.php           ← Login / logout admin
│   │       ├── stats.php          ← Statistik dashboard
│   │       ├── menu.php           ← CRUD menu
│   │       ├── orders.php         ← Daftar pesanan
│   │       ├── order-detail.php   ← Detail pesanan + items
│   │       ├── notifications.php  ← Notifikasi dapur
│   │       ├── ai-menu-helpers.php← Validasi SQL AI
│   │       ├── ai-menu-parse.php  ← NL → intent + SQL
│   │       ├── ai-menu-confirm.php← Eksekusi SQL terkonfirmasi
│   │       └── ai-menu-history.php← Riwayat perintah AI
│   ├── midtrans-sdk/
│   ├── config.php
│   ├── env.php
│   ├── .env                       ← API keys (git-ignored)
│   └── .env.example
├── frontend/
│   ├── index.html                 ← Simulator QR / daftar meja
│   ├── table.html                 ← Halaman menu & pemesanan
│   ├── checkout.html              ← Midtrans SNAP embed
│   ├── payment-result.html        ← Hasil pembayaran
│   ├── css/style.css
│   ├── js/
│   ├── image/
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
│           ├── auth.js
│           ├── kelola-menu.js
│           ├── detail-menu.js
│           ├── laporan.js
│           ├── notifikasi.js
│           └── ai-menu.js
├── database/
│   ├── init.sql                   ← Schema + data dummy (auto-run)
│   ├── migration_add_columns.sql
│   ├── migration_admin.sql        ← Tabel admin_users
│   ├── migration_notifications.sql← Kolom is_notified + TRIGGER
│   ├── migration_ai_menu_logs.sql ← Tabel ai_menu_logs
│   └── migration_payment_logs_order_id.sql
├── docker/
│   └── Dockerfile
└── docker-compose.yml
```

---

## Cara Menjalankan

### Prasyarat

Pastikan sudah terinstall:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) atau Docker Engine (Linux)
- Browser modern

```bash
docker --version
docker compose version
```

---

### Langkah 1: Clone / Download Project

```bash
git clone <url-repo>
cd PSI-kel-3-
```

---

### Langkah 2: Isi API Keys

Buat file `backend/.env` dari contoh:

```bash
cp backend/.env.example backend/.env
```

Isi dengan nilai yang sesuai:

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

Cara mendapatkan API Key Midtrans:
1. Daftar/login ke https://dashboard.sandbox.midtrans.com
2. **Settings** → **Access Keys**
3. Salin **Sandbox Server Key** dan **Sandbox Client Key**

Cara mendapatkan KoboiLLM API Key:
- Daftar di https://lite.koboillm.com dan buat API key

---

### Langkah 3: Jalankan Docker

```bash
docker compose up -d
```

Cek status:
```bash
docker compose ps
```

---

### Langkah 4: Jalankan Migrasi Database

```bash
# Tabel admin_users
docker compose exec mysql mysql -uroot -proot123 restaurant_db < database/migration_admin.sql

# Kolom is_notified + TRIGGER notifikasi dapur
docker compose exec mysql mysql -uroot -proot123 restaurant_db < database/migration_notifications.sql

# Tabel ai_menu_logs (AI CRUD Menu)
docker compose exec mysql mysql -uroot -proot123 restaurant_db < database/migration_ai_menu_logs.sql

# Backfill order_id di payment_logs (opsional)
docker compose exec mysql mysql -uroot -proot123 restaurant_db < database/migration_payment_logs_order_id.sql
```

---

### Langkah 5: Buat Akun Admin

Akses URL berikut **satu kali** di browser untuk membuat akun admin default:

```
http://localhost:8080/backend/api/admin/seed.php
```

Setelah akun terbuat, **hapus file `seed.php`** dari server.

---

### Langkah 6: Buka Browser

| URL | Keterangan |
|-----|-----------|
| http://localhost:8080/frontend/index.html | Halaman utama (simulasi QR) |
| http://localhost:8080/frontend/table.html?table=meja-1 | Langsung ke Meja 1 |
| http://localhost:8080/frontend/admin/login.html | Login panel admin |
| http://localhost:8081 | phpMyAdmin (root / root123) |

---

## Alur Pemesanan

```
1. Tamu scan QR Code di meja
         ↓
2. Browser buka: table.html?table=meja-1
         ↓
3. Validasi meja + load menu dari API
         ↓
4. [Opsional] Minta rekomendasi AI
         ↓
5. Tamu pilih menu → "Buat Pesanan & Bayar"
         ↓
6. POST /api/create-order.php → simpan ke DB
         ↓
7. POST /api/create-payment.php → dapat snap_token
         ↓
8. snap.embed(token) → form pembayaran muncul
         ↓
9. Tamu bayar (kartu/QRIS/dll)
         ↓
10. Midtrans kirim webhook → update payment_status='paid'
    → TRIGGER otomatis set is_notified=1
         ↓
11. Browser redirect ke payment-result.html
```

---

## Panel Admin

Login di `http://localhost:8080/frontend/admin/login.html`

| Halaman | Fungsi |
|---------|--------|
| Dashboard | Statistik total menu, pesanan, revenue |
| Kelola Menu | Tambah, edit, nonaktifkan produk |
| Kategori | Filter menu berdasarkan kategori |
| Galeri Gambar | Upload dan manajemen foto menu |
| Laporan | Riwayat pesanan dengan detail item |
| Notifikasi Dapur | Pesanan lunas siap dimasak (auto-refresh 10 detik) |
| AI CRUD Menu | Kelola menu via perintah bahasa natural |
| Pengaturan | Konfigurasi akun admin |

---

## Fitur AI CRUD Menu

Kelola menu dengan perintah bahasa natural, dieksekusi hanya setelah konfirmasi admin.

**Contoh perintah:**
```
Tambah menu Ayam Geprek harga 15000 kategori makanan
Ubah harga Es Teh menjadi 6000
Nonaktifkan menu Gado-Gado
Tampilkan semua menu minuman
```

**Alur:**
1. Admin ketik perintah → AI menerjemahkan ke SQL
2. SQL ditampilkan sebagai preview
3. Admin klik "Konfirmasi Eksekusi"
4. Backend re-validasi → eksekusi dalam transaksi

**Keamanan:**
- AI hanya boleh akses tabel `products`
- DELETE selalu menjadi `UPDATE ... SET is_active = 0`
- SQL divalidasi dua kali (parse + confirm)
- Rate limit: 15 request per 5 menit per sesi
- Semua perintah tercatat di `ai_menu_logs`

**Chat persisten:** Saat kembali ke halaman AI CRUD Menu, seluruh riwayat percakapan direkonstruksi dari database. Perintah yang belum dikonfirmasi dapat dilanjutkan.

---

## API Reference

### Client

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/backend/api/table.php?code=meja-1` | Info meja |
| GET | `/backend/api/products.php` | Semua menu aktif |
| GET | `/backend/api/client-config.php` | Midtrans client key |
| POST | `/backend/api/create-order.php` | Buat pesanan |
| POST | `/backend/api/create-payment.php` | Dapat snap_token |
| GET | `/backend/api/order-status.php?code=ORD-...` | Status pesanan |
| POST | `/backend/api/webhook.php` | Callback Midtrans |
| POST | `/backend/api/ai-recommend.php` | Rekomendasi AI |

### Admin (butuh session login)

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/backend/api/admin/auth.php` | Login |
| DELETE | `/backend/api/admin/auth.php` | Logout |
| GET | `/backend/api/admin/stats.php` | Statistik dashboard |
| GET/POST/PUT/DELETE | `/backend/api/admin/menu.php` | CRUD menu |
| GET | `/backend/api/admin/orders.php` | Daftar pesanan |
| GET | `/backend/api/admin/order-detail.php?code=ORD-...` | Detail pesanan |
| GET | `/backend/api/admin/notifications.php` | Notifikasi dapur |
| PATCH | `/backend/api/admin/notifications.php` | Dismiss notifikasi |
| POST | `/backend/api/admin/ai-menu-parse.php` | NL → intent + SQL |
| POST | `/backend/api/admin/ai-menu-confirm.php` | Eksekusi / batalkan |
| GET | `/backend/api/admin/ai-menu-history.php` | Riwayat AI |

---

## Tentang Midtrans

### Mode Sandbox vs Production

| | Sandbox | Production |
|---|---------|-----------|
| Tujuan | Testing | Uang sungguhan |
| `MIDTRANS_IS_PRODUCTION` | `false` | `true` |

### Kartu Kredit untuk Testing

| Field | Nilai |
|-------|-------|
| Nomor Kartu | `4811 1111 1111 1114` |
| CVV | `123` |
| Expired | Bulan/tahun di masa depan |
| OTP/3DS | `112233` |

---

## Webhook — Cara Testing

Midtrans butuh URL publik. Gunakan cloudflared:

```bash
cloudflared tunnel --url http://localhost:8080
```

Kamu akan mendapat URL seperti `https://abc123-random.trycloudflare.com`.

Daftarkan di Midtrans Dashboard:
- **Settings** → **Configuration** → **Payment Notification URL**:
```
https://abc123-random.trycloudflare.com/backend/api/webhook.php
```

---

## Database

Buka phpMyAdmin di http://localhost:8081 (root / root123)

| Tabel | Fungsi |
|-------|--------|
| `tables` | Data meja restoran |
| `products` | Menu makanan & minuman |
| `orders` | Header pesanan |
| `order_items` | Detail item dalam pesanan |
| `payment_logs` | Log callback dari Midtrans |
| `admin_users` | Akun admin panel |
| `ai_menu_logs` | Audit log perintah AI CRUD Menu |

### Reset database (hapus semua pesanan)

```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE payment_logs;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
SET FOREIGN_KEY_CHECKS = 1;
```

---

## Perintah Docker

```bash
# Jalankan semua service
docker compose up -d

# Matikan
docker compose down

# Lihat log Apache/PHP
docker compose logs -f app

# Masuk ke container PHP
docker compose exec app bash

# Rebuild (hanya jika Dockerfile berubah)
docker compose build

# Hapus semua termasuk data MySQL
docker compose down -v && docker compose up -d
```

---

## Troubleshooting

**"Koneksi database gagal"**
- Pastikan container mysql running: `docker compose ps`
- MySQL butuh ~10 detik untuk siap pertama kali
- `DB_HOST` harus `mysql`, bukan `localhost`

**"Gagal membuat transaksi Midtrans"**
- Pastikan Server Key dan Client Key sudah benar di `backend/.env`
- Cek log: `docker compose logs -f app`

**"Gagal memuat data laporan / dashboard"**
- Pastikan sudah login di `admin/login.html`
- Cek apakah migrasi sudah dijalankan (terutama `migration_admin.sql`)

**"Notifikasi dapur tidak muncul"**
- Pastikan `migration_notifications.sql` sudah dijalankan
- Webhook harus berjalan agar `payment_status` terupdate (atau update manual via phpMyAdmin)

**"AI CRUD Menu error"**
- Pastikan `KOBOI_API_KEY` sudah diisi di `backend/.env`
- Pastikan `migration_ai_menu_logs.sql` sudah dijalankan
- Rate limit: 15 request per 5 menit — tunggu jika kena limit

**Webhook tidak diterima**
- Pastikan cloudflared tunnel berjalan
- Pastikan URL webhook di dashboard Midtrans sudah diperbarui

**Port sudah dipakai**
Ganti di `docker-compose.yml`:
```yaml
ports:
  - "9090:80"   # ganti 8080 → 9090
```

---

## Referensi

| Topik | Link |
|-------|------|
| Midtrans Snap Docs | https://docs.midtrans.com/docs/snap-overview |
| Midtrans Sandbox Dashboard | https://dashboard.sandbox.midtrans.com |
| KoboiLLM | https://lite.koboillm.com |
| PHP PDO Docs | https://www.php.net/manual/en/book.pdo.php |
| Docker Compose Docs | https://docs.docker.com/compose/ |
| Cloudflared | https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/ |
