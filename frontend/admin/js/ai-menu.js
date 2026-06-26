const API = '/backend/api/admin';

const state = {
  pendingLogId:   null,
  pendingIntent:  null,
  isLoading:      false,
  historyLoaded:  false,
};

document.getElementById('todayDate').textContent =
  new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

// ── Input keyboard ────────────────────────────────────────────
document.getElementById('chatInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function useChip(btn) {
  document.getElementById('chatInput').value = btn.textContent.trim();
  sendMessage();
}

// ── Kirim pesan ───────────────────────────────────────────────
async function sendMessage() {
  const input  = document.getElementById('chatInput');
  const prompt = input.value.trim();
  if (!prompt || state.isLoading) return;

  if (state.pendingLogId) await doConfirm('cancel');

  appendUserMsg(prompt);
  input.value = '';
  input.style.height = 'auto';
  setLoading(true);

  const typingId = appendTyping();

  try {
    const res  = await fetch(`${API}/ai-menu-parse.php`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const json = await res.json();
    removeTyping(typingId);

    if (!json.success) { appendAIError(json.message || 'Terjadi kesalahan.'); return; }
    handleParseResponse(json);

  } catch {
    removeTyping(typingId);
    appendAIError('Koneksi gagal. Periksa jaringan dan coba lagi.');
  } finally {
    setLoading(false);
    loadLogHistory();
  }
}

// ── Handle respons parse ──────────────────────────────────────
function handleParseResponse(json) {
  if (json.intent === 'UNKNOWN' || json.need_clarification) {
    appendAIMsg(json.clarification_question || json.message || 'Perintah tidak dikenali.');
    return;
  }
  if (json.sql && json.need_confirmation) {
    state.pendingLogId  = json.log_id;
    state.pendingIntent = json.intent;
    appendAIWithSQL(json.log_id, json.intent, json.message, json.sql, json.params, true);
    return;
  }
  if (json.sql && !json.need_confirmation) {
    state.pendingLogId  = json.log_id;
    state.pendingIntent = json.intent;
    doConfirm('confirm');
  }
}

// ── Konfirmasi / Batalkan ─────────────────────────────────────
async function doConfirm(action) {
  const logId = state.pendingLogId;
  if (!logId) return;

  state.pendingLogId  = null;
  state.pendingIntent = null;
  disableConfirmButtons(logId);

  if (action === 'cancel') {
    fetch(`${API}/ai-menu-confirm.php`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: logId, action: 'cancel' }),
    }).catch(() => {});
    appendSystemMsg('Perintah dibatalkan.');
    loadLogHistory();
    return;
  }

  const typingId = appendTyping();
  try {
    const res  = await fetch(`${API}/ai-menu-confirm.php`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: logId, action: 'confirm' }),
    });
    const json = await res.json();
    removeTyping(typingId);
    if (!json.success) { appendAIError(json.message || 'Eksekusi gagal.'); return; }
    appendExecutionResult(json);
  } catch {
    removeTyping(typingId);
    appendAIError('Eksekusi gagal. Coba lagi.');
  } finally {
    loadLogHistory();
  }
}

// ── Rekonstruksi chat dari server history ─────────────────────
function rebuildChatFromHistory(logs) {
  if (!logs.length) return;

  const wrap = document.getElementById('chatMessages');
  wrap.innerHTML = '';

  addMsg(`<div class="msg msg-sys" style="margin-bottom:4px">
    <div class="msg-bubble">Hari ini, ${new Date().toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
  </div>`);

  addMsg(`<div class="msg msg-sys">
    <div class="msg-bubble" style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:6px 14px">
      — Melanjutkan ${logs.length} riwayat percakapan —
    </div>
  </div>`);

  let lastPending = null;

  for (const log of logs) {
    // User bubble
    addMsg(`<div class="msg msg-user" data-log-id="${log.id}">
      <div class="msg-avatar">A</div>
      <div class="msg-bubble">${esc(log.prompt)}</div>
    </div>`);

    // AI tidak paham
    if (!log.generated_sql) {
      if (log.status === 'failed') {
        addMsg(`<div class="msg msg-ai">
          <div class="msg-avatar" style="background:#ef4444">!</div>
          <div class="msg-bubble" style="border-color:#ef444430">
            <span style="color:#dc2626">AI tidak dapat memproses perintah ini.</span>
          </div>
        </div>`);
      }
      continue;
    }

    // Ada SQL
    const params   = Array.isArray(log.params) ? log.params : [];
    const isPending = log.status === 'pending';
    if (isPending) lastPending = log;

    const aiMsg = intentToNaturalMsg(log.intent, log.status, log.result_message);
    appendAIWithSQL(
      log.id, log.intent, aiMsg, log.generated_sql, params,
      isPending, /* fromHistory = */ true
    );

    if (log.status === 'executed') {
      addMsg(`<div class="msg msg-ai">
        <div class="msg-avatar" style="background:#22c55e">✓</div>
        <div class="msg-bubble">
          <div class="result-block result-ok">✓ ${esc(log.result_message || 'Berhasil dieksekusi')}</div>
        </div>
      </div>`);
    } else if (log.status === 'cancelled') {
      addMsg(`<div class="msg msg-sys"><div class="msg-bubble">Perintah dibatalkan.</div></div>`);
    } else if (log.status === 'failed') {
      addMsg(`<div class="msg msg-ai">
        <div class="msg-avatar" style="background:#ef4444">!</div>
        <div class="msg-bubble" style="border-color:#ef444430">
          <span style="color:#dc2626">${esc(log.result_message || 'Eksekusi gagal.')}</span>
        </div>
      </div>`);
    }
  }

  // Restore pending state
  if (lastPending) {
    state.pendingLogId  = lastPending.id;
    state.pendingIntent = lastPending.intent;
    addMsg(`<div class="msg msg-sys"><div class="msg-bubble" style="color:#d97706">↑ Ada perintah tertunda — konfirmasi atau batalkan sebelum melanjutkan</div></div>`);
  } else {
    addMsg(`<div class="msg msg-sys"><div class="msg-bubble">— Sesi baru —</div></div>`);
  }

  wrap.scrollTop = wrap.scrollHeight;
}

function intentToNaturalMsg(intent, status, resultMsg) {
  if (status === 'executed' && resultMsg) return resultMsg;
  const map = {
    CREATE_MENU: 'Siap menambahkan menu baru.',
    UPDATE_MENU: 'Siap mengubah data menu.',
    DELETE_MENU: 'Siap menonaktifkan menu.',
    READ_MENU:   'Menampilkan data menu.',
  };
  return map[intent] || 'Memproses perintah...';
}

// ── DOM helpers ───────────────────────────────────────────────
function appendUserMsg(text) {
  addMsg(`<div class="msg msg-user">
    <div class="msg-avatar">A</div>
    <div class="msg-bubble">${esc(text)}</div>
  </div>`);
}

function appendAIMsg(text) {
  addMsg(`<div class="msg msg-ai">
    <div class="msg-avatar">AI</div>
    <div class="msg-bubble">${esc(text)}</div>
  </div>`);
}

function appendAIError(text) {
  addMsg(`<div class="msg msg-ai">
    <div class="msg-avatar" style="background:#ef4444">!</div>
    <div class="msg-bubble" style="border-color:#ef444430">
      <span style="color:#dc2626">${esc(text)}</span>
    </div>
  </div>`);
}

function appendSystemMsg(text) {
  addMsg(`<div class="msg msg-sys"><div class="msg-bubble">${esc(text)}</div></div>`);
}

// Unified SQL preview – dipakai saat kirim baru DAN saat rebuild history
function appendAIWithSQL(logId, intent, message, sql, params, showButtons, fromHistory = false) {
  const badge      = intentToBadge(intent);
  const paramText  = params && params.length ? 'Params: ' + JSON.stringify(params) : '';
  const isDanger   = ['DELETE_MENU', 'UPDATE_MENU'].includes(intent);
  const confirmId  = 'confirm-' + logId;

  addMsg(`<div class="msg msg-ai" data-log-id="${logId}">
    <div class="msg-avatar">AI</div>
    <div class="msg-bubble">
      ${esc(message)}
      <div class="sql-preview">
        <div class="sql-preview-header">
          <span class="sql-preview-label">Preview SQL</span>
          <span class="sql-preview-badge ${badge.cls}">${badge.label}</span>
        </div>
        <div class="sql-code">${esc(sql)}</div>
        ${paramText ? `<div class="sql-params">${esc(paramText)}</div>` : ''}
      </div>
      ${showButtons && isDanger ? `<div style="margin-top:8px;font-size:11.5px;color:#d97706;display:flex;align-items:center;gap:5px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Operasi ini akan mengubah data.</div>` : ''}
      ${showButtons ? `
        <div class="confirm-actions" id="${confirmId}">
          ${fromHistory ? `<div style="font-size:11px;color:#d97706;margin-bottom:6px;width:100%">⟳ Perintah ini belum dieksekusi — lanjutkan?</div>` : ''}
          <button class="btn-confirm btn-confirm-ok" onclick="doConfirm('confirm')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Konfirmasi Eksekusi
          </button>
          <button class="btn-confirm btn-confirm-no" onclick="doConfirm('cancel')">Batalkan</button>
        </div>` : ''}
    </div>
  </div>`);
}

function appendExecutionResult(json) {
  let inner = `<div class="result-block result-ok">✓ ${esc(json.message)}</div>`;

  if (json.is_read && json.rows && json.rows.length) {
    const cols = Object.keys(json.rows[0]);
    inner += `<div style="overflow-x:auto;margin-top:8px">
      <table class="result-table">
        <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${json.rows.map(r =>
          `<tr>${cols.map(c => `<td>${esc(String(r[c] ?? ''))}</td>`).join('')}</tr>`
        ).join('')}</tbody>
      </table>
    </div>`;
  } else if (json.is_read) {
    inner = `<div class="result-block result-ok">Tidak ada data yang ditemukan.</div>`;
  }

  addMsg(`<div class="msg msg-ai">
    <div class="msg-avatar" style="background:#22c55e">✓</div>
    <div class="msg-bubble">${inner}</div>
  </div>`);
}

function appendTyping() {
  const id = 'typing-' + Date.now();
  addMsg(`<div class="msg msg-ai" id="${id}">
    <div class="msg-avatar">AI</div>
    <div class="msg-bubble" style="padding:0">
      <div class="typing"><span></span><span></span><span></span></div>
    </div>
  </div>`);
  return id;
}

function removeTyping(id) { document.getElementById(id)?.remove(); }

function addMsg(html) {
  const wrap = document.getElementById('chatMessages');
  wrap.insertAdjacentHTML('beforeend', html);
  wrap.scrollTop = wrap.scrollHeight;
}

function disableConfirmButtons(logId) {
  document.getElementById('confirm-' + logId)
    ?.querySelectorAll('button')
    .forEach(b => { b.disabled = true; });
}

function setLoading(on) {
  state.isLoading = on;
  document.getElementById('btnSend').disabled    = on;
  document.getElementById('chatInput').disabled  = on;
}

function intentToBadge(intent) {
  return {
    CREATE_MENU: { cls: 'badge-intent-create', label: 'CREATE'      },
    READ_MENU:   { cls: 'badge-intent-read',   label: 'SELECT'      },
    UPDATE_MENU: { cls: 'badge-intent-update', label: 'UPDATE'      },
    DELETE_MENU: { cls: 'badge-intent-delete', label: 'SOFT DELETE' },
  }[intent] || { cls: 'badge-intent-unknown', label: intent };
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Log Panel + click-to-scroll ───────────────────────────────
async function loadLogHistory() {
  try {
    const res  = await fetch(`${API}/ai-menu-history.php?limit=50`, { credentials: 'include' });
    const json = await res.json();
    if (!json.success) return;

    const logs = json.data.logs;
    renderLogList(logs);

    // Rebuild chat hanya sekali saat halaman pertama dimuat
    if (!state.historyLoaded) {
      state.historyLoaded = true;
      rebuildChatFromHistory([...logs].reverse()); // oldest first
    }
  } catch {}
}

function renderLogList(logs) {
  const el = document.getElementById('logList');
  if (!logs.length) {
    el.innerHTML = '<div style="padding:20px;text-align:center;font-size:12px;color:var(--tx-pale)">Belum ada riwayat</div>';
    return;
  }

  const statusCls = {
    executed:  'log-status-executed',
    cancelled: 'log-status-cancelled',
    failed:    'log-status-failed',
    pending:   'log-status-pending',
  };
  const statusLabel = {
    executed:  'Berhasil',
    cancelled: 'Dibatal',
    failed:    'Gagal',
    pending:   'Pending',
  };

  el.innerHTML = logs.map(l => {
    const time = new Date(String(l.created_at).replace(' ','T'))
      .toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    const isPending = l.status === 'pending' && l.generated_sql;
    return `<div class="log-item ${isPending ? 'log-item-pending' : ''}"
               onclick="scrollToLog(${l.id})"
               title="${esc(l.generated_sql || 'Tidak ada SQL')}">
      <div class="log-item-prompt">${esc(l.prompt)}</div>
      <div class="log-item-meta">
        <span class="log-status ${statusCls[l.status] || 'log-status-pending'}">${statusLabel[l.status] || l.status}</span>
        <span>${time}</span>
        ${isPending ? `<span style="color:#d97706;font-size:10px;font-weight:600">↑ klik untuk lanjut</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

// Klik log item → scroll ke pesan di chat
function scrollToLog(logId) {
  const msgEl = document.querySelector(`[data-log-id="${logId}"]`);
  if (!msgEl) return;

  // Highlight sementara
  msgEl.style.transition = 'background .2s';
  msgEl.style.background = 'var(--accent-bg, #EEF2FF)';
  setTimeout(() => { msgEl.style.background = ''; }, 1200);

  msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Init ──────────────────────────────────────────────────────
loadLogHistory();
