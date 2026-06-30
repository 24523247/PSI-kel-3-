const API = '/backend/api/manager';

let currentDays = 30;
let isCustom    = false;
let customFrom  = '';
let customTo    = '';
const charts    = {};

// ── Palette warna konsisten ───────────────────────────────────
const C = {
  indigo:  '#6366f1',
  indigoA: '#6366f118',
  green:   '#22c55e',
  greenA:  '#22c55e18',
  orange:  '#f59e0b',
  red:     '#ef4444',
  blue:    '#3b82f6',
  purple:  '#8b5cf6',
  cyan:    '#06b6d4',
  border:  '#e2e8f0',
  muted:   '#94a3b8',
};
const PIE_COLORS = [C.indigo, C.orange, C.green, C.red, C.purple, C.cyan, C.blue];

// Chart.js global defaults
Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";
Chart.defaults.font.size   = 11;
Chart.defaults.color       = '#64748b';
Chart.defaults.plugins.legend.labels.boxWidth  = 10;
Chart.defaults.plugins.legend.labels.padding   = 14;
Chart.defaults.plugins.tooltip.padding         = 10;
Chart.defaults.plugins.tooltip.cornerRadius    = 6;
Chart.defaults.plugins.tooltip.titleFont.size  = 12;
Chart.defaults.plugins.tooltip.bodyFont.size   = 11;

// ── Helpers ───────────────────────────────────────────────────
function formatRp(n) {
  n = Number(n);
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace('.', ',') + ' jt';
  if (n >= 1_000)     return 'Rp ' + (n / 1_000).toFixed(0) + ' rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}
function formatRpFull(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}
function formatPct(n, showSign = true) {
  if (n === null || n === undefined) return '—';
  const sign = showSign && n > 0 ? '+' : '';
  return sign + Number(n).toFixed(1) + '%';
}
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function mkChart(id, config) {
  if (charts[id]) charts[id].destroy();
  const ctx  = document.getElementById(id);
  if (!ctx) return null;
  charts[id] = new Chart(ctx, config);
  return charts[id];
}
function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}
function fmtDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Load data ─────────────────────────────────────────────────
async function loadDashboard() {
  setLoadingState(true);
  try {
    const url = isCustom
      ? `${API}/dashboard.php?from=${customFrom}&to=${customTo}`
      : `${API}/dashboard.php?days=${currentDays}`;
    const res  = await fetch(url, { credentials: 'include' });
    const json = await res.json();
    if (!json.success) {
      if (res.status === 401) window.location.replace('../admin/login.html');
      return;
    }
    const d    = json.data;
    const meta = d.meta;
    updatePeriodLabel(meta);
    renderHppBanner(meta.has_cost_data);
    renderKPI(d.summary, meta.has_cost_data, meta);
    renderRevenueTrend(d.revenue_trend, meta);
    renderCategoryChart(d.category_breakdown);
    renderPeakHoursChart(d.peak_hours);
    renderPaymentStatusChart(d.payment_status);
    renderTopProductsTable(d.top_products, meta.has_cost_data);
    renderTableStats(d.table_stats);
  } catch (e) {
    console.error(e);
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(on) {
  document.querySelectorAll('[data-days]').forEach(b => b.disabled = on);
  const applyBtn = document.querySelector('#customPicker .filter-btn');
  if (applyBtn) applyBtn.disabled = on;
}

function updatePeriodLabel(meta) {
  const el = document.getElementById('periodLabel');
  if (!el) return;
  if (meta.is_custom) {
    el.textContent = `${fmtDateShort(meta.date_from)} – ${fmtDateShort(meta.date_to)}`;
  } else {
    el.textContent = '';
  }
}

// ── HPP Banner ────────────────────────────────────────────────
function renderHppBanner(hasCostData) {
  const el = document.getElementById('hppBanner');
  if (el) el.style.display = hasCostData ? 'none' : 'flex';
}

// ── KPI Cards ─────────────────────────────────────────────────
function renderKPI(s, hasCostData, meta) {
  const periodLabel = meta.is_custom
    ? `${fmtDateShort(meta.date_from)} – ${fmtDateShort(meta.date_to)}`
    : `${meta.days} hari terakhir`;
  const growthCls  = s.revenue_growth === null ? '' : (s.revenue_growth >= 0 ? 'up' : 'down');
  const growthTxt  = s.revenue_growth === null
    ? '<span style="color:var(--tx-pale)">— (belum ada data pembanding)</span>'
    : `<span class="${growthCls}">${formatPct(s.revenue_growth)}</span> vs periode sebelumnya`;

  const profitNum  = hasCostData ? formatRp(s.profit) : '—';
  const profitSub  = hasCostData
    ? `<span class="${s.profit >= 0 ? 'up' : 'down'}">${formatPct(s.profit_margin, false)} margin</span>`
    : '<a href="../admin/kelola-menu.html" style="color:var(--accent);font-size:11px">Isi HPP produk →</a>';

  const marginNum  = hasCostData ? formatPct(s.profit_margin, false) : '—';
  const marginSub  = hasCostData
    ? `<span class="${s.profit_margin >= 30 ? 'up' : 'info'}">dari revenue ${formatRp(s.revenue)}</span>`
    : '<span style="color:var(--tx-pale)">Belum ada data HPP</span>';

  document.getElementById('kpiGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-purple">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
      </div>
      <div class="stat-number" style="font-size:18px">${formatRp(s.revenue)}</div>
      <div class="stat-label">Total Revenue</div>
      <div class="stat-sub">${growthTxt}</div>
    </div>

    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-green">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
        </svg>
      </div>
      <div class="stat-number" style="font-size:${hasCostData ? '18px' : '22px'}">${profitNum}</div>
      <div class="stat-label">Total Profit</div>
      <div class="stat-sub">${profitSub}</div>
    </div>

    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-orange">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
        </svg>
      </div>
      <div class="stat-number">${marginNum}</div>
      <div class="stat-label">Margin Rata-rata</div>
      <div class="stat-sub">${marginSub}</div>
    </div>

    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      </div>
      <div class="stat-number">${s.orders_paid}</div>
      <div class="stat-label">Pesanan Lunas</div>
      <div class="stat-sub"><span class="info">${s.orders_total} total</span> · Conv. ${formatPct(s.conversion_rate, false)}</div>
    </div>

    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-purple" style="background:#8b5cf615;color:#8b5cf6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      </div>
      <div class="stat-number" style="font-size:18px">${formatRp(s.avg_order_value)}</div>
      <div class="stat-label">Rata-rata / Pesanan</div>
      <div class="stat-sub"><span class="info">${periodLabel}</span></div>
    </div>
  `;
}

// ── Revenue Trend (Bar + Line overlay) ───────────────────────
function renderRevenueTrend(trend, meta) {
  const hasData = trend.some(t => t.revenue > 0);
  mkChart('chartRevenueTrend', {
    type: 'bar',
    data: {
      labels: trend.map(t => fmtDate(t.date)),
      datasets: [
        {
          type: 'bar',
          label: 'Revenue',
          data: trend.map(t => t.revenue),
          backgroundColor: C.indigoA,
          borderColor: C.indigo,
          borderWidth: 1.5,
          borderRadius: 3,
          yAxisID: 'y',
          order: 2,
        },
        {
          type: 'line',
          label: 'Pesanan',
          data: trend.map(t => t.orders),
          borderColor: C.orange,
          borderWidth: 2,
          pointRadius: (meta?.days ?? currentDays) <= 14 ? 3 : 0,
          pointHoverRadius: 4,
          tension: 0.4,
          fill: false,
          yAxisID: 'y1',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          callbacks: {
            label: ctx => ctx.datasetIndex === 0
              ? 'Revenue: ' + formatRpFull(ctx.raw)
              : 'Pesanan: ' + ctx.raw,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 10, maxRotation: 0 },
        },
        y: {
          position: 'left',
          grid: { color: C.border },
          ticks: { callback: v => formatRp(v) },
        },
        y1: {
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { precision: 0, color: C.orange },
          title: { display: false },
        },
      },
    },
  });

  if (!hasData) showNoData('chartRevenueTrend', 'Belum ada pesanan pada periode ini');
}

// ── Category Breakdown (Doughnut) ────────────────────────────
function renderCategoryChart(cats) {
  if (!cats.length) { showNoData('chartCategory', 'Belum ada data'); return; }
  mkChart('chartCategory', {
    type: 'doughnut',
    data: {
      labels: cats.map(c => c.category.charAt(0).toUpperCase() + c.category.slice(1)),
      datasets: [{
        data: cats.map(c => c.revenue),
        backgroundColor: PIE_COLORS.slice(0, cats.length),
        borderWidth: 2,
        borderColor: '#fff',
        hoverBorderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${formatRpFull(ctx.raw)} (${ctx.parsed.toFixed(0)}% rev)`,
            afterLabel: (ctx) => {
              const cat = cats[ctx.dataIndex];
              return cat.qty_sold ? `  ${cat.qty_sold} terjual` : '';
            },
          },
        },
      },
    },
  });
}

// ── Peak Hours (Bar, 0–23) ────────────────────────────────────
function renderPeakHoursChart(hours) {
  const maxOrders = Math.max(...hours.map(h => h.orders));
  mkChart('chartPeakHours', {
    type: 'bar',
    data: {
      labels: hours.map(h => h.hour.toString().padStart(2, '0') + ':00'),
      datasets: [{
        label: 'Pesanan',
        data: hours.map(h => h.orders),
        backgroundColor: hours.map(h =>
          h.orders === maxOrders && maxOrders > 0 ? C.orange : C.indigoA
        ),
        borderColor: hours.map(h =>
          h.orders === maxOrders && maxOrders > 0 ? C.orange : C.indigo
        ),
        borderWidth: 1,
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => `Jam ${ctx[0].label}`,
            label: ctx => ` ${ctx.raw} pesanan`,
            afterLabel: ctx => {
              const rev = hours[ctx.dataIndex].revenue;
              return rev > 0 ? ` ${formatRpFull(rev)} revenue` : '';
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 12,
            maxRotation: 0,
            callback: (_, i) => i % 2 === 0 ? hours[i].hour.toString().padStart(2, '0') : '',
          },
        },
        y: {
          grid: { color: C.border },
          ticks: { precision: 0 },
          beginAtZero: true,
        },
      },
    },
  });
}

// ── Payment Status (Doughnut) ─────────────────────────────────
function renderPaymentStatusChart(ps) {
  const labels = ['Lunas', 'Menunggu', 'Gagal', 'Dibatalkan'];
  const vals   = [ps.paid, ps.pending, ps.failed, ps.cancelled];
  const colors = [C.green, C.orange, C.red, C.muted];

  const total = vals.reduce((a, b) => a + b, 0);
  if (!total) { showNoData('chartPaymentStatus', 'Belum ada data'); return; }

  mkChart('chartPaymentStatus', {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: vals,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} (${total > 0 ? Math.round(ctx.raw / total * 100) : 0}%)`,
          },
        },
      },
    },
  });
}

// ── Top Products Table ────────────────────────────────────────
function renderTopProductsTable(products, hasCostData) {
  const el = document.getElementById('topProductsTable');
  if (!el) return;

  if (!products.length) {
    el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--tx-pale);font-size:13px">Belum ada data penjualan pada periode ini</div>';
    return;
  }

  const hppCols = hasCostData ? `
    <th>HPP / unit</th>
    <th class="center">Profit</th>
    <th class="center">Margin</th>` : '';

  const rows = products.map((p, i) => {
    const catBadge  = p.category === 'makanan' ? 'badge-cat-food' : 'badge-cat-drink';
    const marginCls = p.margin >= 50 ? 'margin-high' : p.margin >= 30 ? 'margin-mid' : 'margin-low';
    const hppCells  = hasCostData ? `
      <td>${p.cost_price > 0 ? formatRpFull(p.cost_price) : '<span style="color:var(--tx-pale)">—</span>'}</td>
      <td class="center">${p.cost_price > 0 ? formatRpFull(p.profit) : '—'}</td>
      <td class="center">${p.cost_price > 0 ? `<span class="margin-badge ${marginCls}">${formatPct(p.margin, false)}</span>` : '—'}</td>` : '';

    return `<tr>
      <td class="center" style="color:var(--tx-pale);font-weight:700">${i + 1}</td>
      <td><span style="font-weight:600;color:var(--tx)">${esc(p.name)}</span></td>
      <td><span class="cat-badge ${catBadge}">${esc(p.category)}</span></td>
      <td class="center" style="font-weight:600">${p.qty_sold}</td>
      <td style="font-weight:600;color:var(--tx)">${formatRpFull(p.revenue)}</td>
      ${hppCells}
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead>
          <tr>
            <th class="center" style="width:40px">#</th>
            <th>Nama Produk</th>
            <th>Kategori</th>
            <th class="center">Terjual</th>
            <th>Revenue</th>
            ${hppCols}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${!hasCostData ? `<div class="hpp-hint">Isi Harga Pokok (HPP) di <a href="../admin/kelola-menu.html">Kelola Menu</a> untuk melihat kolom Profit & Margin.</div>` : ''}
  `;
}

// ── Table Stats (horizontal bar) ────────────────────────────
function renderTableStats(tables) {
  if (!tables.length) { showNoData('chartTableStats', 'Belum ada data'); return; }
  mkChart('chartTableStats', {
    type: 'bar',
    data: {
      labels: tables.map(t => t.table_name),
      datasets: [{
        label: 'Revenue',
        data: tables.map(t => t.revenue),
        backgroundColor: C.indigoA,
        borderColor: C.indigo,
        borderWidth: 1.5,
        borderRadius: 3,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${formatRpFull(ctx.raw)}`,
            afterLabel: ctx => ` ${tables[ctx.dataIndex].orders} pesanan`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: C.border },
          ticks: { callback: v => formatRp(v) },
        },
        y: { grid: { display: false } },
      },
    },
  });
}

// ── No data placeholder ───────────────────────────────────────
function showNoData(canvasId, msg) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const wrap = canvas.parentElement;
  canvas.style.display = 'none';
  if (!wrap.querySelector('.no-data-msg')) {
    const d  = document.createElement('div');
    d.className = 'no-data-msg';
    d.textContent = msg;
    wrap.appendChild(d);
  }
}

// ── Days filter ───────────────────────────────────────────────
document.querySelectorAll('[data-days]').forEach(btn => {
  btn.addEventListener('click', () => {
    isCustom    = false;
    currentDays = parseInt(btn.dataset.days);
    document.querySelectorAll('[data-days]').forEach(b => b.classList.remove('filter-active'));
    document.getElementById('btnCustom')?.classList.remove('filter-active');
    document.getElementById('customPicker').style.display = 'none';
    btn.classList.add('filter-active');
    loadDashboard();
  });
});

// ── Custom date range picker ──────────────────────────────────
function toggleCustomPicker() {
  const picker = document.getElementById('customPicker');
  const btn    = document.getElementById('btnCustom');
  const isOpen = picker.style.display === 'flex';
  if (isOpen) {
    closeCustomPicker();
    return;
  }
  picker.style.display = 'flex';
  btn.classList.add('filter-active');
  const todayStr  = new Date().toISOString().split('T')[0];
  const inputFrom = document.getElementById('inputFrom');
  const inputTo   = document.getElementById('inputTo');
  inputFrom.max   = todayStr;
  inputTo.max     = todayStr;
  if (!inputFrom.value) {
    const from = new Date();
    from.setDate(from.getDate() - 29);
    inputFrom.value = from.toISOString().split('T')[0];
    inputTo.value   = todayStr;
  }
}

function closeCustomPicker() {
  document.getElementById('customPicker').style.display = 'none';
  if (!isCustom) {
    document.getElementById('btnCustom')?.classList.remove('filter-active');
  }
}

function applyCustomRange() {
  const from = document.getElementById('inputFrom').value;
  const to   = document.getElementById('inputTo').value;
  if (!from || !to) {
    alert('Pilih tanggal awal dan akhir terlebih dahulu');
    return;
  }
  if (from > to) {
    alert('Tanggal awal tidak boleh setelah tanggal akhir');
    return;
  }
  isCustom   = true;
  customFrom = from;
  customTo   = to;
  document.querySelectorAll('[data-days]').forEach(b => b.classList.remove('filter-active'));
  document.getElementById('btnCustom').classList.add('filter-active');
  document.getElementById('customPicker').style.display = 'none';
  loadDashboard();
}

// ── AI Insight ────────────────────────────────────────────────
async function loadInsight() {
  try {
    const res  = await fetch('/backend/api/manager/ai-insight.php', { credentials: 'include' });
    const json = await res.json();
    if (json.success && json.cached) renderInsight(json.data);
  } catch {}
}

async function refreshInsight() {
  const btn  = document.getElementById('btnInsight');
  const meta = document.getElementById('insightMeta');
  const body = document.getElementById('insightBody');

  btn.disabled  = true;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg> Menganalisa...';
  meta.textContent = 'AI sedang menganalisa data penjualan...';
  body.innerHTML = `<div style="padding:20px 4px">
    <div class="skeleton sk-text sk-w-60" style="margin-bottom:10px"></div>
    <div class="skeleton sk-text sk-w-40" style="margin-bottom:8px"></div>
    <div class="skeleton sk-text sk-w-50" style="margin-bottom:8px"></div>
    <div class="skeleton sk-text sk-w-32"></div>
  </div>`;

  try {
    const insightDays = isCustom
      ? Math.max(7, Math.min(90, Math.ceil((new Date(customTo) - new Date(customFrom)) / 86400000) + 1))
      : currentDays;
    const res  = await fetch('/backend/api/manager/ai-insight.php', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ days: insightDays }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Gagal menganalisa data');
    renderInsight(json.data);
  } catch (e) {
    meta.textContent = 'Gagal menganalisa';
    body.innerHTML   = `<div style="padding:14px 4px;color:#b91c1c;font-size:13px">${esc(e.message)}</div>`;
    btn.disabled     = false;
    btn.innerHTML    = 'Coba Lagi';
  }
}

function renderInsight(data) {
  const btn  = document.getElementById('btnInsight');
  const meta = document.getElementById('insightMeta');
  const body = document.getElementById('insightBody');

  meta.textContent = `Data ${data.days} hari terakhir · Diperbarui ${timeAgoInsight(data.generated_at_unix)}`;
  btn.disabled     = false;
  btn.innerHTML    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg> Perbarui';
  body.innerHTML   = `<div class="insight-content">${mdToHtml(data.insight)}</div>`;
}

function mdToHtml(text) {
  const lines = text.split('\n');
  let html = '', inUl = false, inOl = false;

  const closeList = () => {
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }
  };
  const safe = s => s
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>');

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('## ')) {
      closeList();
      html += `<div class="insight-h">${safe(line.slice(3))}</div>`;
    } else if (/^[-*] /.test(line)) {
      if (inOl) { html += '</ol>'; inOl = false; }
      if (!inUl) { html += '<ul>'; inUl = true; }
      html += `<li>${safe(line.slice(2))}</li>`;
    } else if (/^\d+\. /.test(line)) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (!inOl) { html += '<ol>'; inOl = true; }
      html += `<li>${safe(line.replace(/^\d+\. /,''))}</li>`;
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      html += `<p>${safe(line)}</p>`;
    }
  }
  closeList();
  return html;
}

function timeAgoInsight(unix) {
  const diff = Math.floor(Date.now() / 1000 - unix);
  if (diff < 60)    return 'baru saja';
  if (diff < 3600)  return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

loadDashboard();
loadInsight();
