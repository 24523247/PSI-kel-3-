// ============================================================
// DUMMY DATA
// ============================================================
let menuData = [
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

let nextId = 13;

// ============================================================
// STATE
// ============================================================
let filtered    = [...menuData];
let currentPage = 1;
const PER_PAGE  = 8;
let editingId   = null;
let deleteId    = null;

// ============================================================
// INIT
// ============================================================
function init() {
  setTimeout(() => {
    renderStats();
    applyFilters();
  }, 900); // simulate loading
}

// ============================================================
// STATS
// ============================================================
function renderStats() {
  const total    = menuData.length;
  const aktif    = menuData.filter(m => m.status === 'aktif').length;
  const kategori = [...new Set(menuData.map(m => m.category))].length;
  const gambar   = menuData.filter(m => m.hasImage).length;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M9 5h11M9 12h11M9 19h11M4.5 5h.01M4.5 12h.01M4.5 19h.01"/>
        </svg>
      </div>
      <div class="stat-number">${total}</div>
      <div class="stat-label">Total Menu</div>
      <div class="stat-sub"><span class="up">↑ 2</span> produk bulan ini</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-green">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <div class="stat-number">${aktif}</div>
      <div class="stat-label">Menu Aktif</div>
      <div class="stat-sub"><span class="info">${Math.round(aktif/total*100)}%</span> dari total menu</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-purple">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="stat-number">${kategori}</div>
      <div class="stat-label">Total Kategori</div>
      <div class="stat-sub"><span class="info">Makanan</span> &amp; Minuman</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-orange">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      </div>
      <div class="stat-number">8</div>
      <div class="stat-label">Gambar Terupload</div>
      <div class="stat-sub"><span style="color:var(--yellow);font-weight:600">4</span> menunggu upload</div>
    </div>
  `;
}

// ============================================================
// FILTER & RENDER TABLE
// ============================================================
function applyFilters() {
  const q    = document.getElementById('searchInput').value.toLowerCase().trim();
  const kat  = document.getElementById('filterKategori').value;
  const stat = document.getElementById('filterStatus').value;

  filtered = menuData.filter(m => {
    const matchQ    = !q    || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
    const matchKat  = !kat  || m.category === kat;
    const matchStat = !stat || m.status === stat;
    return matchQ && matchKat && matchStat;
  });

  currentPage = 1;
  renderTable();
  renderPagination();
  updateFilterText();
}

function resetFilters() {
  document.getElementById('searchInput').value    = '';
  document.getElementById('filterKategori').value = '';
  document.getElementById('filterStatus').value   = '';
  applyFilters();
}

function updateFilterText() {
  const el = document.getElementById('filterResultText');
  if (filtered.length === menuData.length) {
    el.innerHTML = `Menampilkan semua <strong>${menuData.length}</strong> menu`;
  } else {
    el.innerHTML = `Ditemukan <strong>${filtered.length}</strong> menu dari total ${menuData.length} menu`;
  }
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  const start = (currentPage - 1) * PER_PAGE;
  const page  = filtered.slice(start, start + PER_PAGE);
  const total = filtered.length;

  document.getElementById('tableCount').textContent = `(${total})`;

  if (total === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="table-empty">
          <div class="table-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <h3>Tidak ada hasil</h3>
          <p>Coba ubah kata kunci atau filter pencarian</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = page.map(m => `
    <tr>
      <td><input type="checkbox" data-id="${m.id}" style="cursor:pointer"></td>
      <td>
        <div class="product-thumb" style="background:${m.gradient}">
          <span>${m.emoji}</span>
        </div>
      </td>
      <td>
        <div class="product-name-cell">
          <span class="name">${esc(m.name)}</span>
          <span class="desc-short">${esc(m.description)}</span>
        </div>
      </td>
      <td>${esc(m.category)}</td>
      <td class="price-cell">${formatRp(m.price)}</td>
      <td>
        ${m.status === 'aktif'
          ? `<span class="badge badge-green"><span class="badge-dot"></span>Aktif</span>`
          : `<span class="badge badge-gray"><span class="badge-dot"></span>Nonaktif</span>`}
      </td>
      <td class="date-cell">${formatDate(m.createdAt)}</td>
      <td class="action-cell center">
        <div class="action-btns" style="justify-content:center">
          <button class="btn-icon" title="Lihat Detail" onclick="viewDetail(${m.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="btn-icon edit" title="Edit" onclick="openEditModal(${m.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon danger" title="Hapus" onclick="openDeleteModal(${m.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

// ============================================================
// PAGINATION
// ============================================================
function renderPagination() {
  const wrap      = document.getElementById('paginationWrap');
  const totalPage = Math.ceil(filtered.length / PER_PAGE);
  const start     = Math.min((currentPage - 1) * PER_PAGE + 1, filtered.length);
  const end       = Math.min(currentPage * PER_PAGE, filtered.length);

  if (filtered.length === 0) { wrap.innerHTML = ''; return; }

  let pages = '';
  for (let i = 1; i <= totalPage; i++) {
    if (i === 1 || i === totalPage || Math.abs(i - currentPage) <= 1) {
      pages += `<button class="pg-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 2) {
      pages += `<span class="pg-dots">…</span>`;
    }
  }

  wrap.innerHTML = `
    <span class="pagination-info">
      Menampilkan <strong>${start}–${end}</strong> dari <strong>${filtered.length}</strong> menu
    </span>
    <div class="pagination-controls">
      <button class="pg-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      ${pages}
      <button class="pg-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPage ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>`;
}

function changePage(n) {
  const totalPage = Math.ceil(filtered.length / PER_PAGE);
  if (n < 1 || n > totalPage) return;
  currentPage = n;
  renderTable();
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// CHECK ALL
// ============================================================
function toggleCheckAll(el) {
  document.querySelectorAll('#tableBody input[type=checkbox]').forEach(cb => cb.checked = el.checked);
}

// ============================================================
// MODAL ADD / EDIT
// ============================================================
function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Tambah Menu';
  resetForm();
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function openEditModal(id) {
  const item = menuData.find(m => m.id === id);
  if (!item) return;
  editingId = id;

  document.getElementById('modalTitle').textContent = 'Edit Menu';
  document.getElementById('fieldName').value     = item.name;
  document.getElementById('fieldKategori').value = item.category;
  document.getElementById('fieldDesc').value     = item.description;
  document.getElementById('fieldHarga').value    = formatNumber(item.price);
  document.getElementById('fieldStatus').value   = item.status;

  // Reset image preview
  const placeholder = document.getElementById('uploadPlaceholder');
  const preview     = document.getElementById('uploadPreview');
  placeholder.classList.remove('hidden');
  preview.classList.add('hidden');
  document.getElementById('uploadArea').classList.remove('has-image');

  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  resetForm();
}

function resetForm() {
  document.getElementById('fieldName').value     = '';
  document.getElementById('fieldKategori').value = '';
  document.getElementById('fieldDesc').value     = '';
  document.getElementById('fieldHarga').value    = '';
  document.getElementById('fieldStatus').value   = 'aktif';
  document.getElementById('imageInput').value    = '';

  const placeholder = document.getElementById('uploadPlaceholder');
  const preview     = document.getElementById('uploadPreview');
  placeholder.classList.remove('hidden');
  preview.classList.add('hidden');
  document.getElementById('uploadArea').classList.remove('has-image');

  // Clear errors
  ['errName','errKategori','errHarga'].forEach(id => {
    document.getElementById(id).classList.remove('show');
  });
  ['fieldName','fieldKategori','fieldHarga'].forEach(id => {
    document.getElementById(id).classList.remove('error');
  });
}

// ============================================================
// SAVE MENU
// ============================================================
function saveMenu() {
  const name   = document.getElementById('fieldName').value.trim();
  const kat    = document.getElementById('fieldKategori').value;
  const desc   = document.getElementById('fieldDesc').value.trim();
  const harga  = parseHarga(document.getElementById('fieldHarga').value);
  const status = document.getElementById('fieldStatus').value;

  // Validation
  let valid = true;
  if (!name)  { showFieldError('fieldName', 'errName');       valid = false; }
  if (!kat)   { showFieldError('fieldKategori', 'errKategori'); valid = false; }
  if (!harga) { showFieldError('fieldHarga', 'errHarga');     valid = false; }
  if (!valid) return;

  if (editingId !== null) {
    // Edit
    const idx = menuData.findIndex(m => m.id === editingId);
    if (idx !== -1) {
      menuData[idx] = { ...menuData[idx], name, category: kat, description: desc, price: harga, status };
    }
    showToast('Berhasil', `"${name}" berhasil diperbarui`, 'success');
  } else {
    // Add
    const themes = {
      Makanan: [
        { emoji:'🍛', gradient:'linear-gradient(135deg,#ffeaa7,#fdcb6e)' },
        { emoji:'🍜', gradient:'linear-gradient(135deg,#fd9644,#e17055)' },
        { emoji:'🍲', gradient:'linear-gradient(135deg,#a29bfe,#6c5ce7)' },
        { emoji:'🍗', gradient:'linear-gradient(135deg,#f093fb,#f5576c)' },
        { emoji:'🥗', gradient:'linear-gradient(135deg,#55efc4,#00b894)' },
      ],
      Minuman: [
        { emoji:'🧋', gradient:'linear-gradient(135deg,#a8edea,#fed6e3)' },
        { emoji:'🥤', gradient:'linear-gradient(135deg,#43e97b,#38f9d7)' },
        { emoji:'☕', gradient:'linear-gradient(135deg,#6a3093,#a044ff)' },
        { emoji:'🍵', gradient:'linear-gradient(135deg,#4facfe,#00f2fe)' },
      ]
    };
    const pool  = themes[kat] || themes.Makanan;
    const theme = pool[Math.floor(Math.random() * pool.length)];
    const today = new Date().toISOString().split('T')[0];

    menuData.unshift({
      id: nextId++, name, category: kat, description: desc,
      price: harga, status, emoji: theme.emoji,
      gradient: theme.gradient, createdAt: today
    });
    showToast('Berhasil', `"${name}" berhasil ditambahkan`, 'success');
  }

  closeModal();
  renderStats();
  applyFilters();
}

function showFieldError(fieldId, errId) {
  document.getElementById(fieldId).classList.add('error');
  document.getElementById(errId).classList.add('show');
  document.getElementById(fieldId).addEventListener('input', function() {
    this.classList.remove('error');
    document.getElementById(errId).classList.remove('show');
  }, { once: true });
}

// ============================================================
// DELETE
// ============================================================
function openDeleteModal(id) {
  const item = menuData.find(m => m.id === id);
  if (!item) return;
  deleteId = id;
  document.getElementById('deleteItemName').textContent = `"${item.name}"`;
  document.getElementById('deleteOverlay').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteOverlay').classList.add('hidden');
  deleteId = null;
}

function confirmDelete() {
  const item = menuData.find(m => m.id === deleteId);
  if (!item) return;
  const name = item.name;
  menuData = menuData.filter(m => m.id !== deleteId);
  closeDeleteModal();
  renderStats();
  applyFilters();
  showToast('Dihapus', `"${name}" berhasil dihapus`, 'error');
}

// ============================================================
// NAVIGATE TO DETAIL
// ============================================================
function viewDetail(id) {
  window.location.href = `detail-menu.html?id=${id}`;
}

// ============================================================
// IMAGE PREVIEW
// ============================================================
function previewImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('Gagal', 'Ukuran file maksimal 2MB', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    const preview     = document.getElementById('uploadPreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    preview.src = ev.target.result;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    document.getElementById('uploadArea').classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

// ============================================================
// EXPORT DUMMY
// ============================================================
function exportDummy() {
  showToast('Info', 'Fitur export akan tersedia setelah integrasi backend', 'info');
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

  const id   = 'toast-' + Date.now();
  const el   = document.createElement('div');
  el.className = `toast ${type}`;
  el.id = id;
  el.innerHTML = `
    <div class="toast-icon-wrap">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type] || icons.info}</svg>
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

function formatNumber(n) {
  return Number(n).toLocaleString('id-ID');
}

function parseHarga(str) {
  return parseInt(str.replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0;
}

function formatHargaInput(el) {
  const raw = el.value.replace(/\./g, '').replace(/[^0-9]/g, '');
  el.value  = raw ? Number(raw).toLocaleString('id-ID') : '';
}

function formatDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Close modal on overlay click ──
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
document.getElementById('deleteOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeDeleteModal();
});

// ── Keyboard: Escape closes modal ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
  }
});

// ── Run ──
init();
