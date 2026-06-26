const API = '/backend/api/admin';
const POLL_INTERVAL = 10000; // refresh tiap 10 detik
let pollTimer = null;

async function loadNotifications() {
  try {
    const res  = await fetch(`${API}/notifications.php`, { credentials: 'include' });
    const json = await res.json();
    if (!json.success) return;
    render(json.data);
  } catch {
    // gagal silently, coba lagi di poll berikutnya
  }
}

function render(list) {
  const wrap  = document.getElementById('notifList');
  const count = document.getElementById('notifCount');

  count.textContent = list.length ? `${list.length} pesanan perlu dimasak` : 'Tidak ada notifikasi aktif';
  count.style.color = list.length ? 'var(--accent)' : 'var(--tx-muted)';

  if (!list.length) {
    wrap.innerHTML = `
      <div class="notif-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;color:var(--tx-pale);margin-bottom:12px"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <p style="font-size:13px;color:var(--tx-muted);font-weight:600">Tidak ada pesanan yang perlu dimasak</p>
        <p style="font-size:12px;color:var(--tx-pale);margin-top:4px">Halaman ini otomatis memperbarui setiap 10 detik</p>
      </div>`;
    return;
  }

  wrap.innerHTML = list.map(n => `
    <div class="notif-card" id="notif-${n.id}">
      <div class="notif-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
      </div>
      <div class="notif-content">
        <div class="notif-header-row">
          <span class="notif-title">Pesanan Baru — ${esc(n.table_name)}</span>
          <span class="notif-time">${timeAgo(n.created_at)}</span>
        </div>
        <div class="notif-meta">
          <code class="notif-code">${esc(n.order_code)}</code>
          <span class="notif-sep">·</span>
          <span>${n.item_count} item</span>
          <span class="notif-sep">·</span>
          <span style="font-weight:600;color:var(--accent)">${formatRp(n.total_amount)}</span>
        </div>
        ${n.items_summary ? `<div style="font-size:12px;color:var(--tx);background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:5px 10px;margin-top:6px;margin-bottom:2px">${esc(n.items_summary)}</div>` : ''}
        <div class="notif-hint">Pembayaran sudah diterima — siap untuk dimasak</div>
      </div>
      <button class="btn btn-primary btn-sm notif-done-btn" onclick="dismiss(${n.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><polyline points="20 6 9 17 4 12"/></svg>
        Selesai Dimasak
      </button>
    </div>`).join('');
}

async function dismiss(id) {
  const card = document.getElementById(`notif-${id}`);
  if (!card) return;

  const btn = card.querySelector('.notif-done-btn');
  btn.disabled    = true;
  btn.textContent = 'Menyimpan...';

  try {
    const res  = await fetch(`${API}/notifications.php`, {
      method:      'PATCH',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ id }),
    });
    const json = await res.json();
    if (!json.success) throw new Error();

    // animasi slide-out
    card.style.transition  = 'opacity .25s, transform .25s';
    card.style.opacity     = '0';
    card.style.transform   = 'translateX(16px)';
    setTimeout(() => { card.remove(); updateCount(); }, 260);
  } catch {
    btn.disabled    = false;
    btn.innerHTML   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><polyline points="20 6 9 17 4 12"/></svg> Selesai Dimasak';
  }
}

function updateCount() {
  const remaining = document.querySelectorAll('[id^="notif-"]').length;
  const count     = document.getElementById('notifCount');
  if (remaining === 0) {
    count.textContent = 'Tidak ada notifikasi aktif';
    count.style.color = 'var(--tx-muted)';
    document.getElementById('notifList').innerHTML = `
      <div class="notif-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;color:var(--tx-pale);margin-bottom:12px"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <p style="font-size:13px;color:var(--tx-muted);font-weight:600">Tidak ada pesanan yang perlu dimasak</p>
        <p style="font-size:12px;color:var(--tx-pale);margin-top:4px">Halaman ini otomatis memperbarui setiap 10 detik</p>
      </div>`;
  } else {
    count.textContent = `${remaining} pesanan perlu dimasak`;
  }
}

function formatRp(n)  { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function esc(s)       { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function timeAgo(s) {
  const diff = Math.floor((Date.now() - new Date(String(s).replace(' ','T'))) / 1000);
  if (diff < 60)   return `${diff}d lalu`;
  if (diff < 3600) return `${Math.floor(diff/60)}m lalu`;
  return `${Math.floor(diff/3600)}j lalu`;
}

// Load awal + polling
loadNotifications();
pollTimer = setInterval(loadNotifications, POLL_INTERVAL);
