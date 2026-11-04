<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>TerasMatrix — Backend Diagnostic</title>
<style>
  body { font-family: monospace; background: #0f172a; color: #e2e8f0; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1   { color: #38bdf8; font-size: 20px; margin-bottom: 24px; }
  .check { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px 16px; border-radius: 8px; background: #1e293b; }
  .ok   { border-left: 3px solid #22c55e; }
  .fail { border-left: 3px solid #ef4444; }
  .warn { border-left: 3px solid #f59e0b; }
  .icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
  .label { font-weight: bold; color: #f1f5f9; margin-bottom: 4px; }
  .detail { color: #94a3b8; font-size: 13px; }
  .code { background: #0f172a; padding: 8px 12px; border-radius: 6px; margin-top: 8px; font-size: 12px; color: #7dd3fc; white-space: pre-wrap; word-break: break-all; }
  h2 { color: #94a3b8; font-size: 13px; margin: 28px 0 12px; text-transform: uppercase; letter-spacing: 1px; }
</style>
</head>
<body>
<h1>🔍 TerasMatrix Backend Diagnostic</h1>

<?php
function check(string $label, bool $ok, string $detail = '', string $code = '', string $level = ''): void {
    $cls  = $level ?: ($ok ? 'ok' : 'fail');
    $icon = $cls === 'ok' ? '✅' : ($cls === 'warn' ? '⚠️' : '❌');
    echo "<div class='check $cls'>";
    echo "<div class='icon'>$icon</div>";
    echo "<div><div class='label'>$label</div>";
    if ($detail) echo "<div class='detail'>$detail</div>";
    if ($code)   echo "<div class='code'>$code</div>";
    echo "</div></div>";
}

// ─── 1. PHP version ──────────────────────────────────────────
$phpVer = PHP_VERSION;
$phpOk  = version_compare($phpVer, '7.4.0', '>=');
check('PHP Version', $phpOk,
    $phpOk ? "PHP $phpVer — OK" : "PHP $phpVer — perlu versi 7.4+");

// ─── 2. PDO extension ────────────────────────────────────────
check('PDO Extension', extension_loaded('pdo'),
    extension_loaded('pdo') ? 'PDO tersedia' : 'PDO tidak aktif — aktifkan di php.ini');

check('PDO MySQL Extension', extension_loaded('pdo_mysql'),
    extension_loaded('pdo_mysql') ? 'pdo_mysql tersedia' : 'pdo_mysql tidak aktif — aktifkan di php.ini');

// ─── 3. Config & helper files ────────────────────────────────
echo "<h2>File Backend</h2>";
$files = [
    'php/config.php'    => 'Konfigurasi DB',
    'php/db.php'        => 'PDO Wrapper',
    'php/validator.php' => 'Validator 6 Faktor',
];
foreach ($files as $path => $label) {
    $full = __DIR__ . '/' . $path;
    $exists = file_exists($full);
    check($label . " ($path)", $exists,
        $exists ? 'File ditemukan' : "File TIDAK ada di: $full");
}

// ─── 4. Load config ──────────────────────────────────────────
echo "<h2>Konfigurasi Database</h2>";
$configOk = false;
try {
    require_once __DIR__ . '/php/config.php';
    $configOk = true;
    check('config.php loaded', true,
        'DB_HOST=' . DB_HOST . ' | DB_NAME=' . DB_NAME . ' | DB_USER=' . DB_USER);
} catch (Throwable $e) {
    check('config.php loaded', false, $e->getMessage());
}

// ─── 5. DB connection ────────────────────────────────────────
if ($configOk) {
    try {
        require_once __DIR__ . '/php/db.php';
        $pdo = DB::pdo();
        $ver = DB::fetchOne('SELECT VERSION() AS v')['v'] ?? '?';
        check('Koneksi MySQL', true, "Terhubung ke MySQL $ver — Database: " . DB_NAME);
    } catch (Throwable $e) {
        check('Koneksi MySQL', false,
            'GAGAL terhubung ke database.',
            $e->getMessage());
    }

    // ─── 6. Tables ───────────────────────────────────────────
    echo "<h2>Tabel Database</h2>";
    $required = ['users','submissions','answers','validation_log'];
    try {
        foreach ($required as $tbl) {
            $row   = DB::fetchOne("SHOW TABLES LIKE ?", [$tbl]);
            $exists = !empty($row);
            $count  = $exists ? (DB::fetchOne("SELECT COUNT(*) AS c FROM `$tbl`")['c'] ?? 0) : 0;
            check(
                "Tabel `$tbl`",
                $exists,
                $exists ? "$count baris data" : "TIDAK ADA — jalankan database.sql di phpMyAdmin"
            );
        }
    } catch (Throwable $e) {
        check('Cek tabel', false, $e->getMessage());
    }

    // ─── 7. API quick test ────────────────────────────────────
    echo "<h2>Test API Endpoint</h2>";
    $apiUrl = (isset($_SERVER['HTTPS']) ? 'https' : 'http')
            . '://' . $_SERVER['HTTP_HOST']
            . str_replace('test.php', 'api.php', $_SERVER['REQUEST_URI']);

    $ctx = stream_context_create([
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\n",
            'content' => json_encode(['email'=>'test@test.com','password'=>'wrongpass','role'=>'owner']),
            'timeout' => 5,
            'ignore_errors' => true,
        ]
    ]);
    $raw = @file_get_contents($apiUrl . '?action=login', false, $ctx);
    if ($raw !== false) {
        $json = json_decode($raw, true);
        if ($json !== null) {
            // API responds (even with error = API is reachable)
            check('API api.php dapat diakses', true,
                'Endpoint login merespons: ' . ($json['message'] ?? '-'),
                'URL: ' . $apiUrl);
        } else {
            check('API api.php dapat diakses', false,
                'Response bukan JSON valid',
                "Raw: " . substr($raw, 0, 200));
        }
    } else {
        check('API api.php dapat diakses', false,
            'Tidak dapat mengakses api.php dari sisi server.',
            'Coba buka langsung: ' . $apiUrl . '?action=login', 'warn');
    }
}

// ─── 8. CORS check ───────────────────────────────────────────
echo "<h2>Informasi Server</h2>";
check('Document Root', true,
    $_SERVER['DOCUMENT_ROOT'],
    'Folder nexaumkm harus berada di dalam document root ini.');

$currentUrl = (isset($_SERVER['HTTPS']) ? 'https' : 'http')
    . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
check('URL saat ini', true, $currentUrl,
    'URL aplikasi Anda: ' . str_replace('backend/test.php', 'html/index.html', $currentUrl));

echo "<h2>Langkah Selanjutnya</h2>";
echo "<div class='check warn'>";
echo "<div class='icon'>📋</div>";
echo "<div><div class='label'>Semua hijau? Buka aplikasi:</div>";
$appUrl = str_replace('backend/test.php', 'html/index.html', $currentUrl);
echo "<div class='code'><a href='$appUrl' style='color:#7dd3fc'>$appUrl</a></div>";
echo "</div></div>";
?>
</body>
</html>
