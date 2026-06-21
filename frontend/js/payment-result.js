const API_BASE   = '/backend/api';
const urlParams  = new URLSearchParams(window.location.search);
const orderCode  = urlParams.get('code');

async function loadOrderStatus() {
    const box = document.getElementById('resultBox');
    if (!orderCode) {
        box.innerHTML = '<div class="result-error"><h2>❌ Kode pesanan tidak ditemukan</h2><p>Silakan kembali ke beranda.</p></div>';
        return;
    }
    try {
        const res  = await fetch(`${API_BASE}/order-status.php?code=${orderCode}`);
        const json = await res.json();
        if (!json.success) {
            box.innerHTML = `<div class="result-error"><h2>❌ Pesanan Tidak Ditemukan</h2><p>${json.message}</p></div>`;
            return;
        }
        renderResult(json.data);
    } catch(e) {
        box.innerHTML = `<div class="result-error"><h2>❌ Koneksi Gagal</h2><p>${e.message}</p></div>`;
    }
}

function renderResult(data) {
    const order = data.order;
    const items = data.items;
    const box   = document.getElementById('resultBox');

    const statusConfig = {
        paid:      { icon: '✅', label: 'LUNAS',          css: 'status-paid',    msg: 'Pembayaran berhasil! Pesananmu sedang diproses.' },
        pending:   { icon: '⏳', label: 'MENUNGGU BAYAR', css: 'status-pending', msg: 'Silakan selesaikan pembayaran sesuai instruksi.' },
        failed:    { icon: '❌', label: 'GAGAL',           css: 'status-failed',  msg: 'Pembayaran gagal atau dibatalkan.' },
        cancelled: { icon: '🚫', label: 'DIBATALKAN',      css: 'status-failed',  msg: 'Pesanan ini telah dibatalkan.' },
    };

    const s = statusConfig[order.payment_status] || statusConfig['pending'];

    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += `
        <tr>
            <td>${item.name}</td>
            <td class="text-center">${item.qty}</td>
            <td class="text-right">${formatRp(item.price)}</td>
            <td class="text-right">${formatRp(item.subtotal)}</td>
        </tr>`;
    });

    box.innerHTML = `
        <div class="result-status ${s.css}">
            <div class="result-icon">${s.icon}</div>
            <div class="result-label">${s.label}</div>
            <div class="result-msg">${s.msg}</div>
        </div>

        <div class="order-detail">
            <div class="order-meta">
                <div><span>Kode Pesanan</span><strong>${order.order_code}</strong></div>
                <div><span>Meja</span><strong>${order.table_name}</strong></div>
                <div><span>Waktu</span><strong>${formatDate(order.created_at)}</strong></div>
            </div>
            <table class="order-items-table">
                <thead>
                    <tr>
                        <th>Menu</th>
                        <th class="text-center">Qty</th>
                        <th class="text-right">Harga</th>
                        <th class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="3"><strong>Total</strong></td>
                        <td class="text-right"><strong>${formatRp(order.total_amount)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div class="result-actions">
            <a href="table.html?table=${order.table_code}" class="btn-secondary">← Pesan Lagi</a>
            <a href="index.html" class="btn-primary-link">🏠 Ke Beranda</a>
        </div>
    `;
}

function formatRp(amount) {
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('id-ID');
}

loadOrderStatus();

// Auto-refresh tiap 5 detik jika status masih pending
setInterval(async () => {
    if (!orderCode) return;
    try {
        const res  = await fetch(`${API_BASE}/order-status.php?code=${orderCode}`);
        const json = await res.json();
        if (json.success && json.data.order.payment_status !== 'pending') {
            renderResult(json.data);
        }
    } catch(e) {}
}, 5000);
