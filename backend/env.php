<?php
// ============================================================
// env.php — Membaca file .env tanpa Composer / library
// ============================================================
// Cara pakai di file lain:
//   require_once __DIR__ . '/env.php';
//   $val = env('MIDTRANS_SERVER_KEY');
// ============================================================

function loadEnv(string $path): void {
    // Sudah pernah dimuat? Skip.
    static $loaded = false;
    if ($loaded) return;

    if (!file_exists($path)) {
        // .env tidak ada — tidak crash, tapi beri peringatan
        error_log(".env tidak ditemukan di: $path");
        $loaded = true;
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        // Lewati baris komentar
        if (str_starts_with(trim($line), '#')) continue;

        // Harus ada tanda =
        if (!str_contains($line, '=')) continue;

        // Pisahkan key dan value (hanya split di = pertama)
        [$key, $value] = explode('=', $line, 2);

        $key   = trim($key);
        $value = trim($value);

        // Hapus tanda kutip jika ada: "nilai" atau 'nilai'
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        // Simpan ke $_ENV dan putenv agar bisa diakses dua cara
        if (!empty($key)) {
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }

    $loaded = true;
}

/**
 * Ambil nilai dari .env
 * Contoh: env('DB_HOST', 'localhost')
 */
function env(string $key, string $default = ''): string {
    return $_ENV[$key] ?? getenv($key) ?: $default;
}
