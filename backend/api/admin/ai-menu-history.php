<?php
// ============================================================
// API: GET /backend/api/admin/ai-menu-history.php
// Riwayat perintah AI untuk admin yang sedang login
// Query params: ?limit=50&offset=0
// ============================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/middleware.php';

setJsonHeaders();
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method tidak diizinkan'], 405);
}

$db     = getDB();
$limit  = max(1, min(100, (int)($_GET['limit']  ?? 50)));
$offset = max(0, (int)($_GET['offset'] ?? 0));

$stmt = $db->prepare("
    SELECT id, prompt, intent, generated_sql, params, status, result_message, created_at
    FROM ai_menu_logs
    WHERE admin_id = ?
    ORDER BY created_at DESC
    LIMIT $limit OFFSET $offset
");
$stmt->execute([$_SESSION['admin_id']]);
$logs = $stmt->fetchAll();

foreach ($logs as &$log) {
    $log['id'] = (int)$log['id'];
    if (!empty($log['params'])) {
        $log['params'] = json_decode($log['params'], true);
    }
}

$countStmt = $db->prepare('SELECT COUNT(*) FROM ai_menu_logs WHERE admin_id = ?');
$countStmt->execute([$_SESSION['admin_id']]);
$total = (int)$countStmt->fetchColumn();

jsonResponse([
    'success' => true,
    'data'    => [
        'logs'   => $logs,
        'total'  => $total,
        'limit'  => $limit,
        'offset' => $offset,
    ],
]);
