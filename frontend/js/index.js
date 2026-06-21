const tables = [
    { code: 'meja-1', name: 'Meja 1' },
    { code: 'meja-2', name: 'Meja 2' },
    { code: 'meja-3', name: 'Meja 3' },
];

function renderTables() {
    const grid = document.getElementById('tableGrid');
    grid.innerHTML = tables.map(t => {
        const url = 'table.html?table=' + t.code;
        return `
        <div class="table-card">
            <div class="table-icon-big">🪑</div>
            <div class="table-name">${t.name}</div>
            <div class="table-code-small">${t.code}</div>
            <a href="${url}" class="btn-table-open">📲 Buka Meja</a>
        </div>`;
    }).join('');
}

renderTables();
