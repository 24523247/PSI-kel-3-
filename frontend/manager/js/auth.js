// ============================================================
// auth.js — Proteksi halaman manajer
// Menggunakan sistem auth yang sama dengan admin (admin_users)
// ============================================================

const API_BASE = '/backend/api/admin';

(async function checkAuth() {
  try {
    const res  = await fetch(`${API_BASE}/auth.php`, { credentials: 'include' });
    const json = await res.json();
    if (!json.success) {
      window.location.replace('../admin/login.html');
      return;
    }
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');
    if (nameEl) nameEl.textContent = json.user.name;
    if (roleEl) {
      const map = { superadmin: 'Super Admin', admin: 'Administrator', manager: 'Manajer' };
      roleEl.textContent = map[json.user.role] || json.user.role;
    }
  } catch {
    window.location.replace('../admin/login.html');
  }
})();

async function adminLogout() {
  await fetch(`${API_BASE}/auth.php`, { method: 'DELETE', credentials: 'include' });
  window.location.replace('../admin/login.html');
}
