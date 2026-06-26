const API      = '/backend/api/admin';
const PER_PAGE = 10;

let allData     = [];
let filtered    = [];
let currentPage = 1;
let editingId   = null;
let deleteId    = null;

// ── Init ─────────────────────────────────────────────────────
async function init() {
  // Cek jika ada URL param ?kategori= dari halaman kategori
  const params = new URLSearchParams(window.location.search);
  if (params.get('kategori')) {
    document.getElementById('filterKategori').value = params.get('kategori');
  }
  // Cek ?edit= untuk auto-buka modal edit
  const editParam = params.get('edit');

  await loadMenu();

  if (editParam) {
    openEditModal(parseInt(editParam, 10));
  }
}

// ── Load semua produk dari API ────────────────────────────────
async function loadMenu() {
  try {
    const res  = await fetch(`${API}/menu.php`, { credentials: 'include' });
    const json = await res.json();
    if (!json.success) {
      showToast('Error', json.message || 'Gagal memuat data', 'error');
      return;
    }
    allData = json.data;
    renderStats();
    applyFilters();
  } catch {
    showToast('Error', 'Tidak dapat terhubung ke server', 'error');
  }
}

// ── Stats ─────────────────────────────────────────────────────
function renderStats() {
  const total    = allData.length;
  const aktif    = allData.filter(m => m.is_active == 1).length;
  const kategori = [...new Set(allData.map(m => m.category))].length;
  const gambar   = allData.filter(m => m.image_url).length;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M9 5h11M9 12h11M9 19h11M4.5 5h.01M4.5 12h.01M4.5 19h.01"/></svg></div>
      <div class="stat-number">${total}</div>
      <div class="stat-label">Total Menu</div>
      <div class="stat-sub"><span class="info">Data real-time</span> dari database</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
      <div class="stat-number">${aktif}</div>
      <div class="stat-label">Menu Aktif</div>
      <div class="stat-sub"><span class="info">${total > 0 ? Math.round(aktif/total*100) : 0}%</span> dari total menu</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" stroke-width="2.5" stroke-linecap="round"/></svg></div>
      <div class="stat-number">${kategori}</div>
      <div class="stat-label">Total Kategori</div>
      <div class="stat-sub"><span class="info">Makanan</span> &amp; Minuman</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>
      <div class="stat-number">${gambar}</div>
      <div class="stat-label">Gambar Terupload</div>
      <div class="stat-sub"><span style="color:var(--yellow);font-weight:600">${total - gambar}</span> belum ada gambar</div>
    </div>`;
}

// ── Filter & Render ──────────────────────────────────────────
function applyFilters() {
  const q    = document.getElementById('searchInput').value.toLowerCase().trim();
  const kat  = document.getElementById('filterKategori').value;
  const stat = document.getElementById('filterStatus').value;

  filtered = allData.filter(m => {
    const matchQ    = !q    || m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
    const matchKat  = !kat  || m.category === kat;
    const matchStat = !stat || (stat === 'aktif' ? m.is_active == 1 : m.is_active == 0);
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
  if (filtered.length === allData.length) {
    el.innerHTML = `Menampilkan semua <strong>${allData.length}</strong> menu`;
  } else {
    el.innerHTML = `Ditemukan <strong>${filtered.length}</strong> menu dari total ${allData.length} menu`;
  }
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  const start = (currentPage - 1) * PER_PAGE;
  const page  = filtered.slice(start, start + PER_PAGE);

  document.getElementById('tableCount').textContent = `(${filtered.length})`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="table-empty">
      <div class="table-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
      <h3>Tidak ada hasil</h3><p>Coba ubah kata kunci atau filter pencarian</p>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = page.map(m => {
    const thumb = m.image_url
      ? `<img src="${m.image_url}" alt="${esc(m.name)}" style="width:40px;height:40px;object-fit:cover;border-radius:var(--r-sm)">`
      : `<div class="product-thumb" style="background:linear-gradient(135deg,var(--accent-lt),var(--accent));font-size:18px">
           ${m.category === 'makanan' ? '🍽️' : '🥤'}
         </div>`;
    return `
    <tr>
      <td><input type="checkbox" data-id="${m.id}" style="cursor:pointer"></td>
      <td>${thumb}</td>
      <td>
        <div class="product-name-cell">
          <span class="name">${esc(m.name)}</span>
          <span class="desc-short">${esc(m.description || '')}</span>
        </div>
      </td>
      <td style="text-transform:capitalize">${esc(m.category)}</td>
      <td class="price-cell">${formatRp(m.price)}</td>
      <td>
        ${m.is_active == 1
          ? `<span class="badge badge-green"><span class="badge-dot"></span>Aktif</span>`
          : `<span class="badge badge-gray"><span class="badge-dot"></span>Nonaktif</span>`}
      </td>
      <td class="date-cell">${formatDate(m.created_at)}</td>
      <td class="action-cell center">
        <div class="action-btns" style="justify-content:center">
          <button class="btn-icon" title="Detail" onclick="viewDetail(${m.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-icon edit" title="Edit" onclick="openEditModal(${m.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" title="Hapus" onclick="openDeleteModal(${m.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Pagination ────────────────────────────────────────────────
function renderPagination() {
  const wrap      = document.getElementById('paginationWrap');
  const totalPage = Math.ceil(filtered.length / PER_PAGE);
  const start     = Math.min((currentPage - 1) * PER_PAGE + 1, filtered.length);
  const end       = Math.min(currentPage * PER_PAGE, filtered.length);

  if (!filtered.length) { wrap.innerHTML = ''; return; }

  let pages = '';
  for (let i = 1; i <= totalPage; i++) {
    if (i === 1 || i === totalPage || Math.abs(i - currentPage) <= 1) {
      pages += `<button class="pg-btn ${i === currentPage ? 'active':''}" onclick="changePage(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 2) {
      pages += `<span class="pg-dots">…</span>`;
    }
  }

  wrap.innerHTML = `
    <span class="pagination-info">Menampilkan <strong>${start}–${end}</strong> dari <strong>${filtered.length}</strong> menu</span>
    <div class="pagination-controls">
      <button class="pg-btn" onclick="changePage(${currentPage-1})" ${currentPage===1?'disabled':''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      ${pages}
      <button class="pg-btn" onclick="changePage(${currentPage+1})" ${currentPage===totalPage?'disabled':''}>
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

function toggleCheckAll(el) {
  document.querySelectorAll('#tableBody input[type=checkbox]').forEach(cb => cb.checked = el.checked);
}

// ── Modal Add / Edit ──────────────────────────────────────────
function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Tambah Menu';
  resetForm();
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function openEditModal(id) {
  const item = allData.find(m => m.id === id);
  if (!item) return;
  editingId = id;

  document.getElementById('modalTitle').textContent  = 'Edit Menu';
  document.getElementById('fieldName').value          = item.name;
  document.getElementById('fieldKategori').value      = item.category;
  document.getElementById('fieldDesc').value          = item.description || '';
  document.getElementById('fieldHarga').value         = formatNumber(item.price);
  document.getElementById('fieldStatus').value        = item.is_active ? 'aktif' : 'nonaktif';

  // Preview gambar jika ada
  const preview     = document.getElementById('uploadPreview');
  const placeholder = document.getElementById('uploadPlaceholder');
  if (item.image_url) {
    preview.src = item.image_url;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    document.getElementById('uploadArea').classList.add('has-image');
  } else {
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    document.getElementById('uploadArea').classList.remove('has-image');
  }

  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  resetForm();
}

function resetForm() {
  ['fieldName','fieldKategori','fieldDesc','fieldHarga'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('fieldStatus').value  = 'aktif';
  document.getElementById('imageInput').value   = '';

  const placeholder = document.getElementById('uploadPlaceholder');
  const preview     = document.getElementById('uploadPreview');
  placeholder.classList.remove('hidden');
  preview.classList.add('hidden');
  preview.src = '';
  document.getElementById('uploadArea').classList.remove('has-image');

  ['errName','errKategori','errHarga'].forEach(id => document.getElementById(id).classList.remove('show'));
  ['fieldName','fieldKategori','fieldHarga'].forEach(id => document.getElementById(id).classList.remove('error'));
}

// ── Save (Create / Update) ────────────────────────────────────
async function saveMenu() {
  const name     = document.getElementById('fieldName').value.trim();
  const category = document.getElementById('fieldKategori').value;
  const desc     = document.getElementById('fieldDesc').value.trim();
  const price    = parseHarga(document.getElementById('fieldHarga').value);
  const isActive = document.getElementById('fieldStatus').value === 'aktif' ? 1 : 0;

  let valid = true;
  if (!name)     { showFieldError('fieldName', 'errName');         valid = false; }
  if (!category) { showFieldError('fieldKategori', 'errKategori'); valid = false; }
  if (!price)    { showFieldError('fieldHarga', 'errHarga');       valid = false; }
  if (!valid)    return;

  // Kirim base64 jika ada gambar baru; imageUrl dikosongkan agar PHP jaga gambar lama
  const previewSrc  = document.getElementById('uploadPreview').src;
  const imageBase64 = previewSrc.startsWith('data:image') ? previewSrc : '';

  const body = { name, category, description: desc, price, is_active: isActive, image_base64: imageBase64 };

  const btnSave = document.getElementById('btnSave');
  btnSave.disabled   = true;
  btnSave.innerHTML  = 'Menyimpan...';

  try {
    let res, json;
    if (editingId !== null) {
      res  = await fetch(`${API}/menu.php`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...body }),
      });
    } else {
      res  = await fetch(`${API}/menu.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
    json = await res.json();

    if (json.success) {
      showToast('Berhasil', editingId ? `"${name}" berhasil diperbarui` : `"${name}" berhasil ditambahkan`, 'success');
      closeModal();
      await loadMenu();
    } else {
      showToast('Gagal', json.message || 'Terjadi kesalahan', 'error');
    }
  } catch {
    showToast('Error', 'Tidak dapat terhubung ke server', 'error');
  } finally {
    btnSave.disabled  = false;
    btnSave.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><polyline points="20 6 9 17 4 12"/></svg> Simpan';
  }
}

function showFieldError(fieldId, errId) {
  document.getElementById(fieldId).classList.add('error');
  document.getElementById(errId).classList.add('show');
  document.getElementById(fieldId).addEventListener('input', function() {
    this.classList.remove('error');
    document.getElementById(errId).classList.remove('show');
  }, { once: true });
}

// ── Delete ────────────────────────────────────────────────────
function openDeleteModal(id) {
  const item = allData.find(m => m.id === id);
  if (!item) return;
  deleteId = id;
  document.getElementById('deleteItemName').textContent = `"${item.name}"`;
  document.getElementById('deleteOverlay').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteOverlay').classList.add('hidden');
  deleteId = null;
}

async function confirmDelete() {
  if (!deleteId) return;
  const item = allData.find(m => m.id === deleteId);
  const btnDel = document.querySelector('#deleteModal .btn-danger');
  btnDel.disabled    = true;
  btnDel.textContent = 'Menghapus...';

  try {
    const res  = await fetch(`${API}/menu.php?id=${deleteId}`, { method: 'DELETE', credentials: 'include' });
    const json = await res.json();
    if (json.success) {
      closeDeleteModal();
      if (json.soft_delete) {
        showToast('Dinonaktifkan', `"${item?.name}" dinonaktifkan — produk pernah dipesan, histori tetap tersimpan`, 'warning');
      } else {
        showToast('Dihapus', `"${item?.name}" berhasil dihapus`, 'success');
      }
      await loadMenu();
    } else {
      showToast('Gagal', json.message || 'Gagal menghapus', 'error');
    }
  } catch {
    showToast('Error', 'Tidak dapat terhubung ke server', 'error');
  } finally {
    btnDel.disabled    = false;
    btnDel.textContent = 'Hapus';
  }
}

// ── Detail & Export ───────────────────────────────────────────
function viewDetail(id) { window.location.href = `detail-menu.html?id=${id}`; }
function exportDummy()  { showToast('Info', 'Fitur export CSV akan segera hadir', 'info'); }

// ── Image Preview ─────────────────────────────────────────────
function previewImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Gagal', 'Ukuran file maksimal 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const preview = document.getElementById('uploadPreview');
    const ph      = document.getElementById('uploadPlaceholder');
    preview.src = ev.target.result;
    preview.classList.remove('hidden');
    ph.classList.add('hidden');
    document.getElementById('uploadArea').classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

// ── Toast ─────────────────────────────────────────────────────
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
    <div class="toast-icon-wrap"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type]||icons.info}</svg></div>
    <div class="toast-content"><div class="toast-title">${title}</div><div class="toast-msg">${msg}</div></div>
    <button class="toast-close" onclick="removeToast('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => removeToast(id), 3500);
}

function removeToast(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('removing');
  setTimeout(() => el.remove(), 200);
}

// ── Helpers ───────────────────────────────────────────────────
function formatRp(n)       { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function formatNumber(n)   { return Number(n).toLocaleString('id-ID'); }
function parseHarga(s)     { return parseInt(String(s).replace(/\./g,'').replace(/[^0-9]/g,''), 10) || 0; }
function formatHargaInput(el) {
  const raw = el.value.replace(/\./g,'').replace(/[^0-9]/g,'');
  el.value  = raw ? Number(raw).toLocaleString('id-ID') : '';
}
function formatDate(s)     { return new Date(String(s).replace(' ','T')).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }); }
function esc(s)            { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Event Listeners ───────────────────────────────────────────
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
document.getElementById('deleteOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeDeleteModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeDeleteModal(); } });

// ── Run ───────────────────────────────────────────────────────
init();
