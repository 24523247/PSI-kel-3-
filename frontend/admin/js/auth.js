// ============================================================
// auth.js — Proteksi halaman admin
// Include sebagai <script> PERTAMA di setiap halaman admin
// ============================================================

const API_BASE = '/backend/api/admin';

// Cek sesi saat halaman dimuat
(async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/auth.php`, { credentials: 'include' });
    const json = await res.json();
    if (!json.success) {
      window.location.replace('login.html');
      return;
    }
    // Isi nama user di sidebar jika ada elemen-nya
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');
    if (nameEl) nameEl.textContent = json.user.name;
    if (roleEl) roleEl.textContent = json.user.role === 'superadmin' ? 'Super Admin' : 'Administrator';
  } catch {
    window.location.replace('login.html');
  }
})();

// Fungsi logout dipanggil dari tombol di sidebar
async function adminLogout() {
  await fetch(`${API_BASE}/auth.php`, { method: 'DELETE', credentials: 'include' });
  window.location.replace('login.html');
}
