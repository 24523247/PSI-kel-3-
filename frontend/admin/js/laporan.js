const API = '/backend/api/admin';
let currentPage = 1;
const PER_PAGE  = 20;
let filterSearch = '';
let filterStatus = '';

function applyFilters() {
  filterSearch = document.getElementById('searchInput').value.trim();
  filterStatus = document.getElementById('filterStatus').value;
  currentPage  = 1;
  loadOrders();
}

function resetFilters() {
  document.getElementById('searchInput').value  = '';
  document.getElementById('filterStatus').value = '';
  filterSearch = '';
  filterStatus = '';
  currentPage  = 1;
  loadOrders();
}

async function loadOrders() {
  const params = new URLSearchParams({ page: currentPage, limit: PER_PAGE });
  if (filterSearch) params.set('search', filterSearch);
  if (filterStatus) params.set('status', filterStatus);

  try {
    const res  = await fetch(`${API}/orders.php?${params}`, { credentials: 'include' });
    const json = await res.json();

    if (!json.success) {
      const msg = res.status === 401
        ? 'Sesi habis, silakan <a href="login.html">login ulang</a>'
        : (json.message || 'Gagal memuat data dari server');
      document.getElementById('tableBody').innerHTML =
        `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--tx-muted)">${msg}</td></tr>`;
      return;
    }

    const { orders, total, total_pages, summary } = json.data;

    document.getElementById('tableCount').textContent = `(${total})`;
    document.getElementById('filterResultText').innerHTML =
      `Menampilkan <strong>${orders.length}</strong> dari <strong>${total}</strong> pesanan`;

    renderSummary(summary);
    renderTable(orders);
    renderPagination(total_pages, total);
  } catch {
    document.getElementById('tableBody').innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--tx-muted)">Gagal memuat data</td></tr>`;
  }
}

function renderSummary(s) {
  if (!s) return;
  document.getElementById('statsRow').style.display = '';
  document.getElementById('statRevenue').textContent = formatRp(s.total_revenue);
  document.getElementById('statPaid').textContent    = s.paid + ' pesanan';
  document.getElementById('statPending').textContent = s.pending + ' pesanan';
  document.getElementById('statFailed').textContent  = (s.failed + s.cancelled) + ' pesanan';
}

function renderTable(orders) {
  const tbody = document.getElementById('tableBody');

  if (!orders.length) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="table-empty">
          <div class="table-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
          <h3>Tidak ada pesanan</h3>
          <p>Belum ada transaksi yang masuk</p>
        </div>
      </td></tr>`;
    return;
  }

  const statusMap = {
    paid:      { label: 'Lunas',      cls: 'badge-green'  },
    pending:   { label: 'Pending',    cls: 'badge-yellow' },
    failed:    { label: 'Gagal',      cls: 'badge-red'    },
    cancelled: { label: 'Dibatalkan', cls: 'badge-gray'   },
  };

  tbody.innerHTML = orders.map(o => {
    const s = statusMap[o.payment_status] || { label: o.payment_status, cls: 'badge-gray' };
    return `
      <tr>
        <td><code style="font-size:12px;color:var(--accent)">${esc(o.order_code)}</code></td>
        <td>${esc(o.table_name)}</td>
        <td class="center" style="color:var(--tx-muted);font-size:13px">${o.item_count}</td>
        <td class="price-cell">${formatRp(o.total_amount)}</td>
        <td><span class="badge ${s.cls}"><span class="badge-dot"></span>${s.label}</span></td>
        <td class="date-cell">${formatDate(o.created_at)}</td>
        <td class="center">
          <button class="btn btn-secondary btn-xs" onclick="openDetail('${esc(o.order_code)}')">Lihat</button>
        </td>
      </tr>`;
  }).join('');
}

function renderPagination(totalPages, total) {
  const wrap  = document.getElementById('paginationWrap');
  if (totalPages <= 1) { wrap.innerHTML = ''; return; }

  const start = (currentPage - 1) * PER_PAGE + 1;
  const end   = Math.min(currentPage * PER_PAGE, total);

  let pages = '';
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      pages += `<button class="pg-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 2) {
      pages += `<span class="pg-dots">…</span>`;
    }
  }

  wrap.innerHTML = `
    <span class="pagination-info">Menampilkan <strong>${start}–${end}</strong> dari <strong>${total}</strong></span>
    <div class="pagination-controls">
      <button class="pg-btn" onclick="changePage(${currentPage-1})" ${currentPage===1?'disabled':''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      ${pages}
      <button class="pg-btn" onclick="changePage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>`;
}

function changePage(n) {
  if (n < 1) return;
  currentPage = n;
  loadOrders();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatRp(n)   { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function formatDate(s) { return new Date(String(s).replace(' ', 'T')).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function esc(s)        { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── Detail Modal ─────────────────────────────────────────────
async function openDetail(code) {
  const overlay = document.getElementById('detailOverlay');
  const body    = document.getElementById('detailBody');
  const footer  = document.getElementById('detailFooter');
  const title   = document.getElementById('detailTitle');

  title.textContent = 'Detail Pesanan';
  body.innerHTML    = '<div style="text-align:center;padding:30px;color:var(--tx-muted)">Memuat...</div>';
  footer.innerHTML  = '<button class="btn btn-ghost btn-sm" onclick="closeDetailModal()">Tutup</button>';
  overlay.classList.remove('hidden');

  try {
    const res  = await fetch(`${API}/order-detail.php?code=${encodeURIComponent(code)}`, { credentials: 'include' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const { order, items } = json.data;
    const statusMap = {
      paid:      { label: 'Lunas',      cls: 'badge-green'  },
      pending:   { label: 'Pending',    cls: 'badge-yellow' },
      failed:    { label: 'Gagal',      cls: 'badge-red'    },
      cancelled: { label: 'Dibatalkan', cls: 'badge-gray'   },
    };
    const s = statusMap[order.payment_status] || { label: order.payment_status, cls: 'badge-gray' };

    title.textContent = esc(order.order_code);

    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;font-size:13px">
        <div><span style="color:var(--tx-muted)">Meja</span><div style="font-weight:600;margin-top:2px">${esc(order.table_name)}</div></div>
        <div><span style="color:var(--tx-muted)">Status</span><div style="margin-top:4px"><span class="badge ${s.cls}"><span class="badge-dot"></span>${s.label}</span></div></div>
        <div><span style="color:var(--tx-muted)">Tanggal</span><div style="font-weight:600;margin-top:2px">${formatDate(order.created_at)}</div></div>
        <div><span style="color:var(--tx-muted)">Total</span><div style="font-weight:700;margin-top:2px;color:var(--accent)">${formatRp(order.total_amount)}</div></div>
      </div>

      <div>
        <div style="font-size:13px;font-weight:600;color:var(--tx-2);margin-bottom:10px">Item Pesanan</div>
        <table class="data-table" style="font-size:12.5px">
          <thead>
            <tr>
              <th>Menu</th>
              <th class="center">Qty</th>
              <th class="right" style="text-align:right">Harga</th>
              <th class="right" style="text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td>${esc(it.name)}</td>
                <td class="center">${it.qty}</td>
                <td style="text-align:right;color:var(--tx-muted)">${formatRp(it.price)}</td>
                <td style="text-align:right;font-weight:600">${formatRp(it.subtotal)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;font-weight:600;padding-top:10px">Total</td>
              <td style="text-align:right;font-weight:700;color:var(--accent);padding-top:10px">${formatRp(order.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;

    footer.innerHTML = `
      <a href="/frontend/payment-result.html?code=${encodeURIComponent(code)}" target="_blank" class="btn btn-secondary btn-sm">Buka Halaman Pembayaran</a>
      <button class="btn btn-ghost btn-sm" onclick="closeDetailModal()">Tutup</button>`;

  } catch (e) {
    body.innerHTML = `<div style="text-align:center;padding:30px;color:var(--tx-muted)">${e.message || 'Gagal memuat detail'}</div>`;
  }
}

function closeDetailModal() {
  document.getElementById('detailOverlay').classList.add('hidden');
}

function closeDetail(e) {
  if (e.target === document.getElementById('detailOverlay')) closeDetailModal();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetailModal(); });

loadOrders();
