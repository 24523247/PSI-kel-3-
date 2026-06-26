const API           = '/backend/api/admin';
const POLL_INTERVAL = 30000;

async function loadNotifications() {
  try {
    const res  = await fetch(`${API}/system-notifications.php`, { credentials: 'include' });
    const json = await res.json();
    if (!json.success) return;
    render(json.data, json.migration_needed);
  } catch {}
}

function render(list, migrationNeeded) {
  const wrap  = document.getElementById('notifList');
  const count = document.getElementById('notifCount');

  if (migrationNeeded) {
    count.textContent = 'Kolom stok belum tersedia';
    count.style.color = 'var(--tx-muted)';
    wrap.innerHTML = `
      <div class="notif-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;color:var(--tx-pale);margin-bottom:12px"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        <p style="font-size:13px;color:var(--tx-muted);font-weight:600">Kolom stok belum diaktifkan</p>
        <p style="font-size:12px;color:var(--tx-pale);margin-top:4px">Jalankan migration_manager.sql untuk mengaktifkan fitur stok</p>
      </div>`;
    return;
  }

  const emptyCount = list.filter(n => n.type === 'stock_empty').length;
  const lowCount   = list.filter(n => n.type === 'stock_low').length;
  const parts = [];
  if (emptyCount) parts.push(`${emptyCount} stok habis`);
  if (lowCount)   parts.push(`${lowCount} stok rendah`);

  count.textContent = parts.length ? parts.join(', ') : 'Semua stok dalam kondisi baik';
  count.style.color = emptyCount ? '#b91c1c' : (lowCount ? '#92400e' : 'var(--tx-muted)');

  if (!list.length) {
    wrap.innerHTML = `
      <div class="notif-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;color:var(--tx-pale);margin-bottom:12px"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        <p style="font-size:13px;color:var(--tx-muted);font-weight:600">Semua stok dalam kondisi baik</p>
        <p style="font-size:12px;color:var(--tx-pale);margin-top:4px">Notifikasi muncul saat ada menu yang stok habis atau mendekati habis</p>
      </div>`;
    return;
  }

  wrap.innerHTML = list.map(n => {
    const isEmpty     = n.type === 'stock_empty';
    const accentColor = isEmpty ? '#b91c1c' : '#92400e';
    const bgColor     = isEmpty ? '#fef2f2' : '#fffbeb';
    const borderColor = isEmpty ? '#fca5a5' : '#fcd34d';
    const typeLabel   = isEmpty ? 'Stok Habis'  : 'Stok Rendah';
    const stockText   = isEmpty ? 'Habis — menu dinonaktifkan otomatis' : `Tersisa ${n.stock} porsi`;
    const catLabel    = String(n.category).charAt(0).toUpperCase() + String(n.category).slice(1);

    return `
    <div class="notif-card" style="border-left-color:${accentColor};background:${bgColor};border-color:${borderColor}">
      <div class="notif-icon" style="background:${bgColor};color:${accentColor}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      </div>
      <div class="notif-content">
        <div class="notif-header-row">
          <span class="notif-title" style="color:${accentColor}">${esc(n.name)}</span>
          <span class="notif-time">${catLabel}</span>
        </div>
        <div class="notif-meta">
          <span style="font-size:11.5px;background:${bgColor};border:1px solid ${borderColor};color:${accentColor};padding:1px 7px;border-radius:4px;font-weight:600">${typeLabel.toUpperCase()}</span>
          <span class="notif-sep">·</span>
          <span>${stockText}</span>
        </div>
        <div class="notif-hint" style="margin-top:4px">${formatRp(n.price)}</div>
      </div>
      <a href="kelola-menu.html" class="btn btn-sm" style="background:${accentColor};color:#fff;border-color:${accentColor};flex-shrink:0;align-self:center;text-decoration:none">
        Isi Stok →
      </a>
    </div>`;
  }).join('');
}

function formatRp(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function esc(s)      { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

loadNotifications();
setInterval(loadNotifications, POLL_INTERVAL);
