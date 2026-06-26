const API = '/backend/api/admin';

async function init() {
  const id = parseInt(new URLSearchParams(window.location.search).get('id'), 10);
  if (!id) { renderNotFound(); return; }

  try {
    const res  = await fetch(`${API}/menu.php?id=${id}`, { credentials: 'include' });
    const json = await res.json();
    if (!json.success || !json.data) { renderNotFound(); return; }

    const item = json.data;
    document.getElementById('bcTitle').textContent = item.name;
    document.title = `${item.name} – Menu Admin`;
    renderDetail(item);
  } catch {
    renderNotFound();
  }
}

function renderDetail(item) {
  const isActive  = item.is_active == 1;
  const badgeHtml = isActive
    ? `<span class="badge badge-green"><span class="badge-dot"></span>Aktif</span>`
    : `<span class="badge badge-gray"><span class="badge-dot"></span>Nonaktif</span>`;

  const thumbHtml = item.image_url
    ? `<img src="${esc(item.image_url)}" alt="${esc(item.name)}" style="width:100%;height:240px;object-fit:cover;display:block">`
    : `<div class="detail-img" style="background:linear-gradient(135deg,var(--accent-lt),var(--accent-dk))">
         <span style="font-size:5rem">${item.category === 'makanan' ? '🍽️' : '🥤'}</span>
       </div>`;

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-grid">
      <div class="detail-product-card">
        ${thumbHtml}
        <div class="detail-product-info">
          <div class="detail-product-name">${esc(item.name)}</div>
          <div class="detail-meta-row">
            <div class="detail-meta-item">
              <span class="lbl">Kategori</span>
              <span class="val" style="text-transform:capitalize">${esc(item.category)}</span>
            </div>
            <div class="detail-meta-item">
              <span class="lbl">Status</span>
              ${badgeHtml}
            </div>
            <div class="detail-meta-item">
              <span class="lbl">Dibuat</span>
              <span class="val">${formatDate(item.created_at)}</span>
            </div>
            <div class="detail-meta-item">
              <span class="lbl">ID Menu</span>
              <span class="val" style="color:var(--tx-pale);font-size:12px">#${String(item.id).padStart(4,'0')}</span>
            </div>
          </div>
          <div class="detail-actions">
            <button class="btn btn-secondary btn-sm" onclick="goEdit(${item.id})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="openDeleteConfirm(${item.id}, '${esc(item.name)}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              Hapus
            </button>
          </div>
        </div>
      </div>

      <div class="detail-cards">
        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-icon" style="background:var(--accent-lt);color:var(--accent)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h3>Deskripsi Produk</h3>
          </div>
          <div class="info-card-body">
            <p>${esc(item.description) || '<em style="color:var(--tx-pale)">Tidak ada deskripsi</em>'}</p>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-icon" style="background:var(--green-bg);color:var(--green)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
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
              <span class="info-val">${item.price <= 10000 ? 'Ekonomis' : item.price <= 25000 ? 'Menengah' : 'Premium'}</span>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-icon" style="background:var(--blue-bg);color:var(--blue)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3>Data Tambahan</h3>
          </div>
          <div class="info-card-body" style="padding-top:12px;padding-bottom:12px">
            <div class="info-row" style="padding-top:0">
              <span class="info-key">Tanggal Dibuat</span>
              <span class="info-val">${formatDate(item.created_at)}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Gambar Produk</span>
              <span class="info-val" style="${item.image_url ? 'color:var(--green)' : 'color:var(--tx-pale)'}">
                ${item.image_url ? 'Tersedia' : 'Belum ada'}
              </span>
            </div>
            <div class="info-row">
              <span class="info-key">Ditampilkan ke Pelanggan</span>
              <span class="info-val">${isActive ? 'Ya' : 'Tidak (nonaktif)'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-overlay hidden" id="deleteOverlay">
      <div class="modal modal-sm" id="deleteModal">
        <div class="modal-body" style="padding-top:28px">
          <div class="confirm-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </div>
          <p class="confirm-title">Hapus Menu</p>
          <p class="confirm-msg">Apakah Anda yakin ingin menghapus<br><strong id="deleteItemName"></strong>?<br>Tindakan ini tidak dapat dibatalkan.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeDeleteConfirm()">Batal</button>
          <button class="btn btn-danger" id="btnConfirmDel" onclick="doDelete()">Hapus</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('deleteOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDeleteConfirm();
  });
}

function renderNotFound() {
  document.getElementById('detailContent').innerHTML = `
    <div class="card" style="padding:60px 20px;text-align:center">
      <div style="font-size:3rem;margin-bottom:12px">🔍</div>
      <h3 style="font-size:15px;font-weight:700;color:var(--tx-muted);margin-bottom:6px">Menu Tidak Ditemukan</h3>
      <p style="font-size:13px;color:var(--tx-pale)">ID produk tidak valid atau sudah dihapus.</p>
      <a href="kelola-menu.html" class="btn btn-primary btn-sm" style="margin-top:16px;display:inline-flex">← Kembali</a>
    </div>`;
}

function goEdit(id) {
  window.location.href = `kelola-menu.html?edit=${id}`;
}

let _deleteId = null;
function openDeleteConfirm(id, name) {
  _deleteId = id;
  document.getElementById('deleteItemName').textContent = `"${name}"`;
  document.getElementById('deleteOverlay').classList.remove('hidden');
}
function closeDeleteConfirm() {
  document.getElementById('deleteOverlay').classList.add('hidden');
  _deleteId = null;
}
async function doDelete() {
  if (!_deleteId) return;
  const btn = document.getElementById('btnConfirmDel');
  btn.disabled    = true;
  btn.textContent = 'Menghapus...';
  try {
    const res  = await fetch(`${API}/menu.php?id=${_deleteId}`, { method: 'DELETE', credentials: 'include' });
    const json = await res.json();
    if (json.success) {
      window.location.href = 'kelola-menu.html';
    } else {
      showToast('Gagal', json.message || 'Gagal menghapus', 'error');
      btn.disabled    = false;
      btn.textContent = 'Hapus';
    }
  } catch {
    showToast('Error', 'Tidak dapat terhubung ke server', 'error');
    btn.disabled    = false;
    btn.textContent = 'Hapus';
  }
}

function showToast(title, msg, type = 'success') {
  const icons = {
    success: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    error:   '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
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

function formatRp(n)   { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function formatDate(s) { return new Date(String(s).replace(' ','T')).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' }); }
function esc(s)        { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

init();
