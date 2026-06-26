const API = '/backend/api/manager';

let currentDays = 30;
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

// ── Load data ─────────────────────────────────────────────────
async function loadDashboard() {
  setLoadingState(true);
  try {
    const res  = await fetch(`${API}/dashboard.php?days=${currentDays}`, { credentials: 'include' });
    const json = await res.json();
    if (!json.success) {
      if (res.status === 401) window.location.replace('../admin/login.html');
      return;
    }
    const d = json.data;
    renderHppBanner(d.meta.has_cost_data);
    renderKPI(d.summary, d.meta.has_cost_data);
    renderRevenueTrend(d.revenue_trend);
    renderCategoryChart(d.category_breakdown);
    renderPeakHoursChart(d.peak_hours);
    renderPaymentStatusChart(d.payment_status);
    renderTopProductsTable(d.top_products, d.meta.has_cost_data);
    renderTableStats(d.table_stats);
  } catch (e) {
    console.error(e);
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(on) {
  document.querySelectorAll('[data-days]').forEach(b => b.disabled = on);
}

// ── HPP Banner ────────────────────────────────────────────────
function renderHppBanner(hasCostData) {
  const el = document.getElementById('hppBanner');
  if (el) el.style.display = hasCostData ? 'none' : 'flex';
}

// ── KPI Cards ─────────────────────────────────────────────────
function renderKPI(s, hasCostData) {
  const growthCls  = s.revenue_growth === null ? '' : (s.revenue_growth >= 0 ? 'up' : 'down');
  const growthTxt  = s.revenue_growth === null
    ? '<span style="color:var(--tx-pale)">— (belum ada data pembanding)</span>'
    : `<span class="${growthCls}">${formatPct(s.revenue_growth)}</span> vs ${currentDays} hari sebelumnya`;

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
      <div class="stat-sub"><span class="info">${currentDays} hari terakhir</span></div>
    </div>
  `;
}

// ── Revenue Trend (Bar + Line overlay) ───────────────────────
function renderRevenueTrend(trend) {
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
          pointRadius: currentDays <= 14 ? 3 : 0,
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
    currentDays = parseInt(btn.dataset.days);
    document.querySelectorAll('[data-days]').forEach(b => b.classList.remove('filter-active'));
    btn.classList.add('filter-active');
    loadDashboard();
  });
});

loadDashboard();
