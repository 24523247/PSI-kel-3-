<?php
// ============================================================
// ai-menu-helpers.php — Validasi SQL dari AI (shared)
// Include di ai-menu-parse.php dan ai-menu-confirm.php
// ============================================================

function validateAISQL(string $sql): string|true
{
    $upper = strtoupper(trim($sql));

    // ── 1. Hanya izinkan SELECT, INSERT INTO products, UPDATE products ──
    if (!preg_match(
        '/^\s*(SELECT\b|INSERT\s+INTO\s+`?products`?\s|UPDATE\s+`?products`?\s)/i',
        $sql
    )) {
        return 'Operasi tidak diizinkan. Hanya SELECT, INSERT INTO products, UPDATE products.';
    }

    // ── 2. Hard DELETE tidak diizinkan (soft delete via UPDATE is_active=0) ──
    if (preg_match('/^\s*DELETE\s+FROM/i', $sql)) {
        return 'Hard DELETE tidak diizinkan. Gunakan UPDATE SET is_active = 0.';
    }

    // ── 3. Keyword berbahaya ──
    $forbidden = [
        'DROP', 'TRUNCATE', 'ALTER', 'CREATE DATABASE', 'CREATE TABLE',
        'EXEC(', 'EXECUTE(', 'GRANT ', 'REVOKE ', ' UNION ', 'UNION(',
        'INFORMATION_SCHEMA', ' -- ', '/*', '*/', 'SLEEP(',
        'BENCHMARK(', 'LOAD_FILE(', 'INTO OUTFILE', 'INTO DUMPFILE',
        'CHAR(', 'ASCII(', 'HEX(', 'BASE64',
    ];
    foreach ($forbidden as $f) {
        if (strpos($upper, strtoupper($f)) !== false) {
            return 'Keyword yang dilarang ditemukan dalam SQL.';
        }
    }

    // ── 4. Tabel selain products dilarang ──
    $forbidden_tables = [
        'orders', 'order_items', 'payment_logs', 'admin_users',
        'ai_menu_logs', 'tables',
    ];
    foreach ($forbidden_tables as $t) {
        if (preg_match('/\b' . preg_quote($t, '/') . '\b/i', $sql)) {
            return "Akses ke tabel '$t' tidak diizinkan.";
        }
    }

    // ── 5. Kolom berbahaya ──
    $forbidden_cols = ['password', 'snap_token', 'gateway_response'];
    foreach ($forbidden_cols as $c) {
        if (preg_match('/\b' . preg_quote($c, '/') . '\b/i', $sql)) {
            return "Kolom '$c' tidak boleh diakses.";
        }
    }

    return true;
}
