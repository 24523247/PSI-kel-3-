# 🍜 Restaurant QR Order System

Sistem pemesanan restoran berbasis QR Code menggunakan **PHP Vanilla**, **MySQL**, dan **Midtrans Sandbox**.

Project ini dibuat untuk **belajar**, bukan production. Fokus pada:
- Alur pemesanan dari scan QR sampai pembayaran
- Cara kerja REST API sederhana dengan PHP
- Integrasi Midtrans Snap tanpa Composer
- Docker untuk development environment

---

## 📁 Struktur Folder

```
restaurant-qr/
├── backend/
│   ├── api/
│   │   ├── table.php           ← GET: info meja
│   │   ├── products.php        ← GET: daftar menu
│   │   ├── create-order.php    ← POST: buat pesanan
│   │   ├── create-payment.php  ← POST: buat transaksi Midtrans
│   │   ├── order-status.php    ← GET: cek status pesanan
│   │   └── webhook.php         ← POST: callback dari Midtrans
│   ├── midtrans-sdk/
│   │   ├── Snap.php            ← Entry point SDK (di-require di create-payment.php)
│   │   └── lib/
│   │       ├── Config.php      ← Konfigurasi Midtrans
│   │       ├── HttpClient.php  ← HTTP request pakai cURL
│   │       └── Snap.php        ← Class Snap::getSnapToken()
│   └── config.php              ← Konfigurasi DB & Midtrans
├── frontend/
│   ├── index.html              ← Simulasi QR / daftar meja
│   ├── table.html              ← Halaman menu & pemesanan
│   ├── payment-result.html     ← Halaman hasil pembayaran
│   └── style.css               ← Styling
├── database/
│   └── init.sql                ← Schema + data dummy
├── docker/
│   └── Dockerfile              ← PHP 8.2 + Apache
├── docker-compose.yml
└── README.md
```

---

## 🚀 Cara Menjalankan

### Prasyarat

Pastikan sudah terinstall:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) atau Docker Engine (Linux)
- Browser modern

Cek apakah Docker sudah berjalan:
```bash
docker --version
docker compose version
```

---

### Langkah 1: Clone / Download Project

```bash
# Jika pakai git
git clone <url-repo>
cd restaurant-qr

# Atau ekstrak ZIP, lalu masuk ke folder
cd restaurant-qr
```

---

### Langkah 2: Isi Midtrans API Key

Buka file **`backend/config.php`**, ganti dua baris ini:

```php
define('MIDTRANS_SERVER_KEY', 'SB-Mid-server-GANTI_DENGAN_SERVER_KEY_KAMU');
define('MIDTRANS_CLIENT_KEY', 'SB-Mid-client-GANTI_DENGAN_CLIENT_KEY_KAMU');
```

Cara mendapatkan API Key:
1. Daftar/login ke [https://dashboard.sandbox.midtrans.com](https://dashboard.sandbox.midtrans.com)
2. Klik **Settings** → **Access Keys**
3. Salin **Sandbox Server Key** dan **Sandbox Client Key**

> ⚠️ **Penting:**
> - **Server Key** = rahasia, hanya dipakai di PHP (backend). Jangan pernah taruh di HTML/JS.
> - **Client Key** = aman ditampilkan di frontend (HTML). Dipakai oleh `snap.js`.

Setelah isi Server Key di `config.php`, buka juga **`frontend/table.html`** dan ganti:
```html
<script
    src="https://app.sandbox.midtrans.com/snap/snap.js"
    data-client-key="SB-Mid-client-GANTI_DENGAN_CLIENT_KEY_KAMU">
</script>
```

---

### Langkah 3: Jalankan Docker

```bash
# Di folder project (yang ada docker-compose.yml)
docker compose up -d
```

Perintah ini akan:
1. Build image PHP + Apache (hanya pertama kali, sekitar 1-2 menit)
2. Jalankan container MySQL dan buat database otomatis dari `database/init.sql`
3. Jalankan container phpMyAdmin
4. Mount folder `backend/` dan `frontend/` langsung ke Apache

Cek apakah semua container berjalan:
```bash
docker compose ps
```

Output yang diharapkan:
```
NAME                    STATUS
restaurant_app          running
restaurant_mysql        running
restaurant_phpmyadmin   running
```

---

### Langkah 4: Buka Browser

| URL | Keterangan |
|-----|-----------|
| http://localhost:8080/frontend/index.html | Halaman utama (simulasi QR) |
| http://localhost:8080/frontend/table.html?table=meja-1 | Langsung ke Meja 1 |
| http://localhost:8081 | phpMyAdmin (lihat isi database) |

---

## 🔄 Alur Pemesanan Lengkap

```
1. Tamu scan QR Code di meja
         ↓
2. Browser buka: table.html?table=meja-1
         ↓
3. JS fetch GET /api/table.php?code=meja-1
   → validasi meja ada di database
         ↓
4. JS fetch GET /api/products.php
   → tampilkan daftar menu
         ↓
5. Tamu pilih menu, klik "Buat Pesanan & Bayar"
         ↓
6. JS fetch POST /api/create-order.php
   → simpan order + order_items ke database
   → dapat order_code (contoh: ORD-20241201-ABC123)
         ↓
7. JS fetch POST /api/create-payment.php
   → PHP kirim data ke API Midtrans
   → dapat snap_token
         ↓
8. snap.pay(snap_token) → popup Midtrans muncul
         ↓
9. Tamu bayar (kartu/transfer/QRIS/dll)
         ↓
10. Midtrans kirim POST ke /api/webhook.php
    → PHP verifikasi signature
    → update payment_status = 'paid'
         ↓
11. Browser redirect ke payment-result.html
    → tampilkan status pesanan
```

---

## 🌐 API Reference

Semua endpoint menggunakan JSON.

### GET `/backend/api/table.php?code=meja-1`

Mengambil info meja berdasarkan kode.

**Response sukses:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "table_code": "meja-1",
    "table_name": "Meja 1"
  }
}
```

---

### GET `/backend/api/products.php`

Mengambil semua menu aktif.

**Response sukses:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Nasi Goreng Spesial", "price": 25000, "category": "makanan" },
    { "id": 7, "name": "Es Teh Manis", "price": 5000, "category": "minuman" }
  ]
}
```

---

### POST `/backend/api/create-order.php`

Membuat pesanan baru.

**Request body:**
```json
{
  "table_code": "meja-1",
  "items": [
    { "product_id": 1, "qty": 2 },
    { "product_id": 7, "qty": 1 }
  ]
}
```

**Response sukses:**
```json
{
  "success": true,
  "message": "Pesanan berhasil dibuat",
  "data": {
    "order_id": 1,
    "order_code": "ORD-20241201-ABC123",
    "total_amount": 55000
  }
}
```

---

### POST `/backend/api/create-payment.php`

Membuat transaksi Midtrans dan mendapatkan `snap_token`.

**Request body:**
```json
{ "order_code": "ORD-20241201-ABC123" }
```

**Response sukses:**
```json
{
  "success": true,
  "snap_token": "xxxx-xxxx-xxxx",
  "order_code": "ORD-20241201-ABC123"
}
```

---

### GET `/backend/api/order-status.php?code=ORD-20241201-ABC123`

Mengambil status dan detail pesanan.

**Response sukses:**
```json
{
  "success": true,
  "data": {
    "order": {
      "order_code": "ORD-20241201-ABC123",
      "table_name": "Meja 1",
      "total_amount": 55000,
      "payment_status": "paid"
    },
    "items": [
      { "name": "Nasi Goreng Spesial", "qty": 2, "price": 25000, "subtotal": 50000 }
    ]
  }
}
```

---

### POST `/backend/api/webhook.php`

Menerima callback dari Midtrans setelah pembayaran.  
**Endpoint ini dipanggil otomatis oleh Midtrans, bukan oleh browser tamu.**

---

## 💳 Tentang Midtrans

### Apa itu Midtrans Snap?

Midtrans Snap adalah cara termudah integrasi pembayaran. Kita cukup:
1. Kirim data transaksi → dapat **snap_token**
2. Panggil `snap.pay(token)` di frontend → popup pembayaran muncul otomatis
3. Midtrans handle semua: kartu kredit, transfer bank, QRIS, GoPay, OVO, dll

### Mode Sandbox vs Production

| | Sandbox | Production |
|---|---------|-----------|
| Tujuan | Testing | Uang sungguhan |
| API URL | `api.sandbox.midtrans.com` | `api.midtrans.com` |
| snap.js URL | `app.sandbox.midtrans.com` | `app.midtrans.com` |
| Konfigurasi | `MIDTRANS_IS_PRODUCTION = false` | `MIDTRANS_IS_PRODUCTION = true` |

### Kartu Kredit untuk Testing Sandbox

Gunakan kartu kredit simulasi ini di popup Midtrans Sandbox:

| Field | Nilai |
|-------|-------|
| Nomor Kartu | `4811 1111 1111 1114` |
| CVV | `123` |
| Expired | Bulan/tahun di masa depan |
| OTP/3DS | `112233` |

---

## 🔔 Webhook — Cara Kerja & Testing

### Apa itu Webhook?

Webhook adalah cara Midtrans memberitahu server kita bahwa pembayaran sudah berhasil.

**Prosesnya:**
```
Tamu bayar di popup Midtrans
         ↓
Midtrans proses pembayaran
         ↓
Midtrans kirim HTTP POST ke webhook URL kamu
(berisi data: order_id, status, amount, signature)
         ↓
PHP kamu terima, verifikasi, update database
         ↓
Status pesanan jadi "paid"
```

### Masalah: Midtrans Tidak Bisa Akses localhost

Midtrans butuh URL yang bisa diakses dari internet.  
`http://localhost:8080` tidak bisa diakses dari luar komputer kamu.

**Solusi: Cloudflared Tunnel (gratis, tanpa akun)**

1. Download cloudflared:
   - Windows: https://github.com/cloudflare/cloudflared/releases → `cloudflared-windows-amd64.exe`
   - Mac: `brew install cloudflared`
   - Linux: `sudo apt install cloudflared`

2. Jalankan tunnel:
```bash
cloudflared tunnel --url http://localhost:8080
```

3. Kamu akan dapat URL seperti:
```
https://abc123-random.trycloudflare.com
```

4. Daftarkan URL webhook di Midtrans Dashboard:
   - Login ke https://dashboard.sandbox.midtrans.com
   - **Settings** → **Configuration**
   - Isi **Payment Notification URL**:
   ```
   https://abc123-random.trycloudflare.com/backend/api/webhook.php
   ```
   - Klik **Save**

5. Coba lakukan pembayaran test — webhook akan diterima.

### Testing Webhook Manual

Kamu bisa test webhook tanpa bayar sungguhan via Midtrans Dashboard:
- **Settings** → **Configuration** → **Send Test Notification**

Atau test langsung via curl:
```bash
curl -X POST http://localhost:8080/backend/api/webhook.php \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORD-20241201-ABC123",
    "status_code": "200",
    "gross_amount": "55000.00",
    "transaction_status": "settlement",
    "fraud_status": "accept",
    "signature_key": "ISI_DENGAN_HASH_YANG_VALID"
  }'
```

> ⚠️ Untuk test via curl, signature_key harus valid.  
> Rumus: `SHA512(order_id + status_code + gross_amount + server_key)`

Lihat log webhook di phpMyAdmin → tabel `payment_logs`.

---

## 🗄️ Database

Buka phpMyAdmin di http://localhost:8081

Login: `root` / `root123`

### Tabel-tabel

| Tabel | Fungsi |
|-------|--------|
| `tables` | Data meja restoran |
| `products` | Menu makanan & minuman |
| `orders` | Header pesanan |
| `order_items` | Detail item dalam pesanan |
| `payment_logs` | Log callback dari Midtrans |

### Melihat semua pesanan

```sql
SELECT o.order_code, t.table_name, o.total_amount, o.payment_status, o.created_at
FROM orders o
JOIN tables t ON t.id = o.table_id
ORDER BY o.created_at DESC;
```

### Reset database (hapus semua pesanan)

```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE payment_logs;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
SET FOREIGN_KEY_CHECKS = 1;
```

---

## ✏️ Workflow Development (Edit Tanpa Rebuild)

Karena kita pakai **bind mount** di Docker, kamu bisa langsung edit file dan hasilnya langsung terlihat:

```
Edit file PHP/HTML/CSS/JS
        ↓
     Save
        ↓
Refresh browser
        ↓
Perubahan langsung muncul ✅
```

**Tidak perlu** `docker compose build` atau `docker compose restart` setiap kali ubah kode.

`docker compose build` hanya diperlukan jika kamu mengubah **`docker/Dockerfile`**.

---

## 🛠️ Perintah Docker yang Berguna

```bash
# Jalankan semua service
docker compose up -d

# Matikan semua service
docker compose down

# Lihat log Apache/PHP (berguna untuk debug error)
docker compose logs -f app

# Lihat log MySQL
docker compose logs -f mysql

# Masuk ke container PHP (untuk debugging)
docker compose exec app bash

# Rebuild image (hanya jika Dockerfile berubah)
docker compose build

# Hapus semua (termasuk data MySQL) dan mulai bersih
docker compose down -v
docker compose up -d
```

---

## ❗ Troubleshooting

### "Koneksi database gagal"

- Pastikan container mysql sudah running: `docker compose ps`
- MySQL butuh ~10 detik untuk siap pertama kali. Tunggu sebentar lalu refresh.
- Cek nama host di `config.php` sudah `mysql` (bukan `localhost`)

### "Gagal membuat transaksi Midtrans"

- Pastikan Server Key dan Client Key sudah diisi dengan benar
- Pastikan koneksi internet aktif (container butuh akses ke `api.sandbox.midtrans.com`)
- Cek log: `docker compose logs -f app`

### Webhook tidak diterima

- Pastikan cloudflared tunnel sedang berjalan
- Pastikan URL webhook di dashboard Midtrans sudah diperbarui
- Cek tabel `payment_logs` di phpMyAdmin — apakah ada entry baru?

### Halaman 403 Forbidden

- Pastikan folder `frontend/` dan `backend/` ada di dalam folder project
- Cek apakah bind mount berhasil: `docker compose exec app ls /var/www/html`

### Port sudah dipakai

Jika port 8080, 3306, atau 8081 sudah dipakai aplikasi lain, ganti di `docker-compose.yml`:
```yaml
ports:
  - "9090:80"   # ganti 8080 → 9090
```

---

## 📚 Belajar Lebih Lanjut

| Topik | Link |
|-------|------|
| Midtrans Snap Docs | https://docs.midtrans.com/docs/snap-overview |
| Midtrans Sandbox Dashboard | https://dashboard.sandbox.midtrans.com |
| PHP PDO Docs | https://www.php.net/manual/en/book.pdo.php |
| Docker Compose Docs | https://docs.docker.com/compose/ |
| Cloudflared | https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/ |
