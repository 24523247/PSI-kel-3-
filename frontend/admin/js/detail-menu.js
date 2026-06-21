// ============================================================
// SAME DUMMY DATA (shared reference — dalam integrasi nyata, pakai API)
// ============================================================
const menuData = [
  { id: 1,  name: 'Nasi Goreng Spesial',  category: 'Makanan',  price: 25000, status: 'aktif',    description: 'Nasi goreng dengan bumbu rempah pilihan, disajikan dengan telur mata sapi, kerupuk udang, dan acar timun segar.', emoji: '🍛', gradient: 'linear-gradient(135deg,#ffeaa7,#fdcb6e)', createdAt: '2026-01-15' },
  { id: 2,  name: 'Mie Ayam Bakso',        category: 'Makanan',  price: 18000, status: 'aktif',    description: 'Mie kuning dengan topping ayam cincang berbumbu, bakso sapi, pangsit goreng, dan kuah kaldu ayam yang gurih.', emoji: '🍜', gradient: 'linear-gradient(135deg,#fd9644,#e17055)', createdAt: '2026-01-18' },
  { id: 3,  name: 'Soto Betawi',            category: 'Makanan',  price: 22000, status: 'aktif',    description: 'Soto khas Betawi dengan kuah santan gurih, daging sapi empuk, kentang, tomat, dan emping melinjo renyah.', emoji: '🍲', gradient: 'linear-gradient(135deg,#a29bfe,#6c5ce7)', createdAt: '2026-01-20' },
  { id: 4,  name: 'Ayam Bakar Madu',        category: 'Makanan',  price: 30000, status: 'aktif',    description: 'Ayam bakar marinasi madu dan kecap manis, disajikan dengan lalapan segar, sambal terasi, dan nasi putih pulen.', emoji: '🍗', gradient: 'linear-gradient(135deg,#f093fb,#f5576c)', createdAt: '2026-01-22' },
  { id: 5,  name: 'Gado-Gado Jakarta',      category: 'Makanan',  price: 15000, status: 'nonaktif', description: 'Sayuran rebus segar dilengkapi tahu, tempe, telur rebus, dan disiram saus kacang spesial yang kaya rasa.', emoji: '🥗', gradient: 'linear-gradient(135deg,#55efc4,#00b894)', createdAt: '2026-01-25' },
  { id: 6,  name: 'Nasi Uduk Komplit',      category: 'Makanan',  price: 20000, status: 'aktif',    description: 'Nasi gurih dimasak dengan santan, disajikan dengan ayam goreng, tempe orek, sambal, dan kerupuk udang.', emoji: '🍱', gradient: 'linear-gradient(135deg,#ffecd2,#fcb69f)', createdAt: '2026-02-01' },
  { id: 7,  name: 'Es Teh Manis',           category: 'Minuman',  price: 5000,  status: 'aktif',    description: 'Teh hitam pilihan diseduh panas kemudian disajikan dingin dengan es batu dan gula pasir sesuai selera.', emoji: '🧋', gradient: 'linear-gradient(135deg,#a8edea,#fed6e3)', createdAt: '2026-02-03' },
  { id: 8,  name: 'Es Jeruk Peras',         category: 'Minuman',  price: 8000,  status: 'aktif',    description: 'Jeruk segar diperas langsung, disajikan dengan es batu dan sedikit gula. Menyegarkan dan kaya vitamin C.', emoji: '🍊', gradient: 'linear-gradient(135deg,#f6d365,#fda085)', createdAt: '2026-02-05' },
  { id: 9,  name: 'Jus Alpukat',            category: 'Minuman',  price: 14000, status: 'aktif',    description: 'Alpukat matang diblender dengan susu kental manis dan sedikit coklat meses di atasnya. Creamy dan mengenyangkan.', emoji: '🥑', gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)', createdAt: '2026-02-08' },
  { id: 10, name: 'Kopi Hitam Tubruk',      category: 'Minuman',  price: 8000,  status: 'nonaktif', description: 'Kopi robusta pilihan diseduh dengan metode tubruk tradisional. Kuat, pekat, dan aromatik. Cocok untuk pagi hari.', emoji: '☕', gradient: 'linear-gradient(135deg,#6a3093,#a044ff)', createdAt: '2026-02-10' },
  { id: 11, name: 'Teh Tarik',              category: 'Minuman',  price: 10000, status: 'aktif',    description: 'Teh susu dengan teknik menarik hingga berbusa lembut di atasnya. Manis, gurih, dan hangat menenangkan.', emoji: '🍵', gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', createdAt: '2026-02-12' },
  { id: 12, name: 'Es Campur Spesial',      category: 'Minuman',  price: 12000, status: 'aktif',    description: 'Minuman segar berisi cincau hitam, agar-agar warna-warni, kolang kaling, sirup merah, dan es serut bersih.', emoji: '🧃', gradient: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)', createdAt: '2026-02-15' },
];

// ============================================================
// INIT
// ============================================================
function init() {
  const params = new URLSearchParams(window.location.search);
  const id     = parseInt(params.get('id'), 10);
  const item   = menuData.find(m => m.id === id);

  setTimeout(() => {
    if (!item) {
      renderNotFound();
      return;
    }
    document.getElementById('bcTitle').textContent = item.name;
    document.title = `${item.name} – Menu Admin`;
    renderDetail(item);
  }, 700);
}

// ============================================================
// RENDER DETAIL
// ============================================================
function renderDetail(item) {
  const badgeHtml = item.status === 'aktif'
    ? `<span class="badge badge-green"><span class="badge-dot"></span>Aktif</span>`
    : `<span class="badge badge-gray"><span class="badge-dot"></span>Nonaktif</span>`;

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-grid">

      <!-- LEFT: Product card -->
      <div class="detail-product-card">
        <div class="detail-img" style="background:${item.gradient}">
          <span>${item.emoji}</span>
        </div>
        <div class="detail-product-info">
          <div class="detail-product-name">${esc(item.name)}</div>
          <div class="detail-meta-row">
            <div class="detail-meta-item">
              <span class="lbl">Kategori</span>
              <span class="val">${esc(item.category)}</span>
            </div>
            <div class="detail-meta-item">
              <span class="lbl">Status</span>
              ${badgeHtml}
            </div>
            <div class="detail-meta-item">
              <span class="lbl">Dibuat</span>
              <span class="val">${formatDate(item.createdAt)}</span>
            </div>
            <div class="detail-meta-item">
              <span class="lbl">ID Menu</span>
              <span class="val" style="color:var(--tx-pale);font-size:12px">#${String(item.id).padStart(4,'0')}</span>
            </div>
          </div>
          <div class="detail-actions">
            <button class="btn btn-secondary btn-sm" onclick="showToast('Info','Fitur edit akan tersedia setelah integrasi backend','info')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="showDeleteConfirm()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
              Hapus
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT: Info cards -->
      <div class="detail-cards">

        <!-- Deskripsi -->
        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-icon" style="background:var(--accent-lt);color:var(--accent)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <h3>Deskripsi Produk</h3>
          </div>
          <div class="info-card-body">
            <p>${esc(item.description) || '<em style="color:var(--tx-pale)">Tidak ada deskripsi</em>'}</p>
          </div>
        </div>

        <!-- Harga & Info -->
        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-icon" style="background:var(--green-bg);color:var(--green)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <h3>Informasi Harga</h3>
          </div>
          <div class="info-card-body" style="padding-top:12px;padding-bottom:12px">
            <div class="info-row" style="padding-top:0">
              <span class="info-key">Harga Jual</span>
              <span class="info-price">${formatRp(item.price)}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Kategori Harga</span>
              <span class="info-val">${item.price <= 10000 ? 'Ekonomis' : item.price <= 20000 ? 'Menengah' : 'Premium'}</span>
            </div>
          </div>
        </div>

        <!-- Data Tambahan -->
        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-icon" style="background:var(--blue-bg);color:var(--blue)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3>Data Tambahan</h3>
          </div>
          <div class="info-card-body" style="padding-top:12px;padding-bottom:12px">
            <div class="info-row" style="padding-top:0">
              <span class="info-key">Tanggal Dibuat</span>
              <span class="info-val">${formatDate(item.createdAt)}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Terakhir Diperbarui</span>
              <span class="info-val">${formatDate(item.createdAt)}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Gambar Produk</span>
              <span class="info-val" style="color:var(--tx-pale)">Menggunakan placeholder</span>
            </div>
            <div class="info-row">
              <span class="info-key">Jumlah Dipesan</span>
              <span class="info-val" style="color:var(--tx-pale)">— (tersedia setelah integrasi)</span>
            </div>
          </div>
        </div>

      </div><!-- end detail-cards -->
    </div><!-- end detail-grid -->
  `;
}

// ============================================================
// NOT FOUND
// ============================================================
function renderNotFound() {
  document.getElementById('detailContent').innerHTML = `
    <div class="card" style="padding:60px 20px;text-align:center">
      <div style="font-size:3rem;margin-bottom:12px">🔍</div>
      <h3 style="font-size:15px;font-weight:700;color:var(--tx-muted);margin-bottom:6px">Menu Tidak Ditemukan</h3>
      <p style="font-size:13px;color:var(--tx-pale)">ID produk tidak valid atau sudah dihapus.</p>
      <a href="kelola-menu.html" class="btn btn-primary btn-sm" style="margin-top:16px;display:inline-flex">← Kembali</a>
    </div>`;
}

// ============================================================
// SHOW DELETE CONFIRM (simple alert for demo)
// ============================================================
function showDeleteConfirm() {
  showToast('Info', 'Konfirmasi hapus tersedia di halaman Kelola Menu', 'warning');
}

// ============================================================
// TOAST
// ============================================================
function showToast(title, msg, type = 'success') {
  const icons = {
    success: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    error:   '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    warning: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  };

  const id = 'toast-' + Date.now();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.id = id;
  el.innerHTML = `
    <div class="toast-icon-wrap">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type]}</svg>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>
    <button class="toast-close" onclick="removeToast('${id}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;

  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => removeToast(id), 3500);
}

function removeToast(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('removing');
  setTimeout(() => el.remove(), 200);
}

// ============================================================
// HELPERS
// ============================================================
function formatRp(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

function formatDate(str) {
  return new Date(str).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Run ──
init();
