<?php
/**
 * TerasMatrix — REST API (single-file router)
 *
 * Letakkan file ini di root backend, contoh:
 *   /htdocs/nexaumkm/backend/api.php
 *
 * Endpoint yang tersedia:
 *   POST   /api.php?action=register          — daftar akun baru
 *   POST   /api.php?action=login             — login, dapatkan token
 *   POST   /api.php?action=submit            — kirim formulir 6 faktor  [token required]
 *   GET    /api.php?action=submissions       — daftar submission saya   [token required]
 *   GET    /api.php?action=dashboard         — agregat dashboard         [token required]
 *   GET    /api.php?action=umkm_list         — tabel UMKM + skor         [token required]
 *   GET    /api.php?action=factor_averages   — rata-rata 6 faktor        [token required]
 */

require_once __DIR__ . '/php/config.php';
require_once __DIR__ . '/php/db.php';
require_once __DIR__ . '/php/validator.php';

// ── CORS headers ──────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: '  . CORS_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Helpers ───────────────────────────────────────────────────
function respond(bool $success, $data = null, string $message = '', int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success'=>$success, 'message'=>$message, 'data'=>$data], JSON_UNESCAPED_UNICODE);
    exit;
}

function bodyJson(): array {
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?? []) : [];
}

// ── JWT helpers ────────────────────────────────────────────────
function b64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64UrlDecode(string $data): string {
    $pad = strlen($data) % 4;
    if ($pad) $data .= str_repeat('=', 4 - $pad);
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwtEncode(array $payload): string {
    $header     = b64UrlEncode(json_encode(['alg'=>'HS256','typ'=>'JWT']));
    $payload['exp'] = time() + JWT_EXPIRE;
    $body       = b64UrlEncode(json_encode($payload));
    $sig        = b64UrlEncode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    return "$header.$body.$sig";
}

function jwtDecode(string $token): ?array {
    $parts = explode('.', trim($token));
    if (count($parts) !== 3) return null;
    [$header, $body, $sig] = $parts;
    $expectedSig = b64UrlEncode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    if (!hash_equals($expectedSig, $sig)) return null;
    $data = json_decode(b64UrlDecode($body), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;
    return $data;
}

function requireAuth(string $fallbackToken = ''): array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';
    $tokenHeader = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';

    foreach (['getallheaders', 'apache_request_headers'] as $headerReader) {
        if (!function_exists($headerReader)) continue;
        $headers = $headerReader();
        if (!is_array($headers)) continue;
        foreach ($headers as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0 && !$authHeader) {
                $authHeader = $value;
            } elseif (strcasecmp($name, 'X-Auth-Token') === 0 && !$tokenHeader) {
                $tokenHeader = $value;
            }
        }
    }

    $token = trim(preg_replace('/^Bearer\s+/i', '', $authHeader));
    if (!$token) $token = trim($tokenHeader);
    if (!$token) $token = trim($fallbackToken);

    $payload = $token ? jwtDecode($token) : null;
    if (!$payload) {
        respond(false, null, 'Tidak terautentikasi. Silakan login.', 401);
    }
    return $payload;
}

// ── Router ────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    match (true) {

        // ── POST /api.php?action=register ─────────────────────
        $action === 'register' && $method === 'POST' => (function () {
            $body = bodyJson();
            $role = $body['role'] ?? 'owner';

            // Validasi profil via Validator
            $result = Validator::validateSubmission(array_merge($body, [
                // Isi dummy jawaban agar validasi profil saja yang jalan
                // (Jawaban divalidasi di submit, bukan register)
            ]), $role);

            // Ambil hanya error profil (bukan error jawaban)
            $profileErrors = array_filter($result['errors'], fn($e) =>
                in_array($e['field'], ['umkm_name','email','role','password']));

            if (!empty($profileErrors)) {
                respond(false, ['errors'=>array_values($profileErrors)],
                    'Data registrasi tidak valid.', 422);
            }

            // Cek email duplikat
            $existing = DB::fetchOne('SELECT id FROM users WHERE email = ?',
                [strtolower(trim($body['email'] ?? ''))]);
            if ($existing) respond(false, null, 'Email sudah terdaftar.', 409);

            // Cek duplikat owner untuk UMKM yang sama
            if ($role === 'owner') {
                $existingOwner = DB::fetchOne(
                    'SELECT id FROM users WHERE role = "owner" AND LOWER(TRIM(umkm_name)) = LOWER(TRIM(?))',
                    [$body['umkm_name'] ?? '']
                );
                if ($existingOwner) {
                    respond(false, null, 'UMKM "' . ($body['umkm_name'] ?? '') . '" sudah memiliki Owner terdaftar. Pendaftaran Owner baru untuk UMKM yang sama tidak diperbolehkan.', 409);
                }
            }

            // Simpan user
            $hash = password_hash($body['password'] ?? '', PASSWORD_BCRYPT);
            $id   = DB::execute(
                'INSERT INTO users (umkm_name,email,password_hash,role,lokasi,sektor,omzet)
                 VALUES (?,?,?,?,?,?,?)',
                [
                    trim($body['umkm_name'] ?? ''),
                    strtolower(trim($body['email'] ?? '')),
                    $hash,
                    $role,
                    trim($body['lokasi'] ?? '') ?: null,
                    trim($body['sektor'] ?? '') ?: null,
                    is_numeric($body['omzet'] ?? '') ? (int)$body['omzet'] : null,
                ]
            );

            $token = jwtEncode(['user_id'=>$id, 'role'=>$role, 'email'=>$body['email'], 'umkm_name'=>trim($body['umkm_name'] ?? '')]);
            respond(true, [
                'token'     => $token,
                'user_id'   => $id,
                'role'      => $role,
                'email'     => strtolower(trim($body['email'] ?? '')),
                'umkm_name' => trim($body['umkm_name'] ?? ''),
                'lokasi'    => trim($body['lokasi']    ?? ''),
                'sektor'    => trim($body['sektor']    ?? ''),
                'omzet'     => is_numeric($body['omzet'] ?? '') ? (int)$body['omzet'] : null,
            ], 'Registrasi berhasil.');
        })(),

        // ── POST /api.php?action=login ────────────────────────
        $action === 'login' && $method === 'POST' => (function () {
            $body  = bodyJson();
            $email = strtolower(trim($body['email'] ?? ''));
            $pwd   = $body['password'] ?? '';

             $user = DB::fetchOne(
                 'SELECT id, umkm_name, email, password_hash, role, is_active,
                         lokasi, sektor, omzet
                  FROM users WHERE email = ?', [$email]);

             if (!$user || !password_verify($pwd, $user['password_hash'])) {
                 respond(false, null, 'Email atau kata sandi salah.', 401);
             }
             if (!$user['is_active']) {
                 respond(false, null, 'Akun tidak aktif. Hubungi admin.', 403);
             }

             // Cek peran cocok jika dikirim
             $roleInput = $body['role'] ?? '';
             if ($roleInput && $roleInput !== $user['role']) {
                 respond(false, null, "Akun ini terdaftar sebagai {$user['role']}, bukan $roleInput.", 403);
             }

             $token = jwtEncode([
                 'user_id'   => $user['id'],
                 'role'      => $user['role'],
                 'email'     => $user['email'],
                 'umkm_name' => $user['umkm_name'],
             ]);
             respond(true, [
                 'token'     => $token,
                 'user_id'   => $user['id'],
                 'role'      => $user['role'],
                 'email'     => $user['email'],
                 'umkm_name' => $user['umkm_name'],
                 'lokasi'    => $user['lokasi'] ?? '',
                 'sektor'    => $user['sektor'] ?? '',
                 'omzet'     => $user['omzet']  ?? null,
             ], 'Login berhasil.');
        })(),

        // ── POST /api.php?action=submit ───────────────────────
        $action === 'submit' && $method === 'POST' => (function () {
            $body = bodyJson();
            $fallbackToken = is_string($body['_auth_token'] ?? null) ? $body['_auth_token'] : '';
            unset($body['_auth_token']);
            $auth = requireAuth($fallbackToken);
            $role = $auth['role'];

            // Cek apakah user ini sudah pernah mengisi kuesioner
            $alreadySubmitted = DB::fetchOne(
                'SELECT id FROM submissions WHERE user_id = ?',
                [$auth['user_id']]
            );
            if ($alreadySubmitted) {
                respond(false, null, 'Anda hanya dapat mengisi kuesioner sekali.', 403);
            }

            // Gabungkan data profil dari JWT dengan jawaban dari body
            // Sehingga validator tidak error karena umkm_name/email kosong
            $submitData = array_merge($body, [
                'email'     => $auth['email']     ?? '',
                'umkm_name' => $auth['umkm_name'] ?? ($body['umkm_name'] ?? 'Pengguna'),
                'role'      => $role,
            ]);

            $result = Validator::validateSubmission($submitData, $role);

            // Jika peran adalah pegawai, validasi bahwa owner dari UMKM yang sama telah mengisi kuesioner
            $ownerSubmission = null;
            if ($role === 'employee') {
                if (!$result['valid']) {
                    respond(false, [
                        'errors'   => $result['errors'],
                        'warnings' => $result['warnings'],
                    ], 'Formulir ditolak: '.count($result['errors']).' error ditemukan.', 422);
                }

                $ownerSubmission = DB::fetchOne(
                    'SELECT s.id, s.score_ins, s.score_ops, s.score_ect, s.score_ov, s.score_ldi, s.score_weq, s.user_id
                     FROM submissions s
                     JOIN users u ON s.user_id = u.id
                     WHERE s.role = "owner" AND s.validation_pass = 1 AND u.umkm_name = ?
                     ORDER BY s.submitted_at DESC LIMIT 1',
                    [$auth['umkm_name']]
                );

                if (!$ownerSubmission) {
                    respond(false, null, 'Owner dari UMKM "' . $auth['umkm_name'] . '" belum mengisi kuesioner. Pegawai hanya dapat mengisi kuesioner setelah Owner mengisinya.', 403);
                }
            }

            // Simpan log validasi & submission apapun hasilnya
            $pdo = DB::pdo();
            $pdo->beginTransaction();

            try {
                $factorSchema = [
                    'INS'=>['max'=>3,'codes'=>['ins_oh1'=>'OH-1','ins_oh2'=>'OH-2','ins_oh3'=>'OH-3',
                                              'ins_oh4'=>'OH-4','ins_oh5'=>'OH-5','ins_oh6'=>'OH-6']],
                    'OV' =>['max'=>5,'codes'=>['ov_oh18'=>'OH-18','ov_oh19'=>'OH-19','ov_oh20'=>'OH-20',
                                              'ov_oh21'=>'OH-21','ov_oh22'=>'OH-22','ov_oh23'=>'OH-23',
                                              'ov_oh24'=>'OH-24','ov_oh25'=>'OH-25']],
                    'LDI'=>['max'=>5,'codes'=>['ldi_oh7'=>'OH-7','ldi_oh8'=>'OH-8','ldi_oh9'=>'OH-9',
                                              'ldi_oh10'=>'OH-10','ldi_oh11'=>'OH-11','ldi_oh12'=>'OH-12']],
                    'WEQ'=>['max'=>5,'codes'=>['weq_oh13'=>'OH-13','weq_oh14'=>'OH-14','weq_oh15'=>'OH-15',
                                              'weq_oh16'=>'OH-16','weq_oh17'=>'OH-17']],
                    'OPS'=>['max'=>5,'codes'=>['ops_oh26'=>'OH-26','ops_oh27'=>'OH-27','ops_oh28'=>'OH-28',
                                              'ops_oh29'=>'OH-29','ops_oh30'=>'OH-30','ops_oh31'=>'OH-31']],
                    'ECT'=>['max'=>5,'codes'=>['ect_oh32'=>'OH-32','ect_oh33'=>'OH-33','ect_oh34'=>'OH-34',
                                              'ect_oh35'=>'OH-35']],
                ];

                $combinedFactorResults = null;

                if ($role === 'owner') {
                    $composite = $result['composite'];

                    // 1. Insert submissions header
                    DB::execute(
                        'INSERT INTO submissions
                           (user_id,role,status,validation_pass,
                            score_ins,score_ov,score_ldi,score_weq,score_ops,score_ect,
                            score_composite,score_on_5,health_category)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
                        [
                            $auth['user_id'],
                            $role,
                            $result['valid'] ? 'submitted' : 'rejected',
                            $result['valid'] ? 1 : 0,
                            $result['scores']['INS']['normScore'] ?? null,
                            $result['scores']['OV']['normScore']  ?? null,
                            $result['scores']['LDI']['normScore'] ?? null,
                            $result['scores']['WEQ']['normScore'] ?? null,
                            $result['scores']['OPS']['normScore'] ?? null,
                            $result['scores']['ECT']['normScore'] ?? null,
                            $composite['composite'] ?? null,
                            $composite['scoreOn5']  ?? null,
                            $composite['category']  ?? null,
                        ]
                    );
                    $submissionId = (int)$pdo->lastInsertId();

                    // 2. Insert jawaban individual
                    foreach ($result['clean_data']['answers'] as $qId => $val) {
                        $fKey = strtoupper(explode('_',$qId)[0]);
                        $code = $factorSchema[$fKey]['codes'][$qId] ?? '';
                        $max  = $factorSchema[$fKey]['max']         ?? 5;
                        DB::execute(
                            'INSERT INTO answers (submission_id,factor_key,question_id,question_code,answer_value,scale_max)
                             VALUES (?,?,?,?,?,?)',
                            [$submissionId, $fKey, $qId, $code, $val, $max]
                        );
                    }

                    // 3. Insert validation log
                    foreach (array_merge(
                        array_map(fn($e)=>array_merge($e,['level'=>'error']),   $result['errors']),
                        array_map(fn($w)=>array_merge($w,['level'=>'warning']), $result['warnings'])
                    ) as $log) {
                        DB::execute(
                            'INSERT INTO validation_log
                               (submission_id,level,factor_key,field_name,error_code,message)
                             VALUES (?,?,?,?,?,?)',
                            [
                                $submissionId,
                                $log['level'],
                                $log['factor'] ?? null,
                                $log['field']  ?? null,
                                $log['code'],
                                $log['message'],
                            ]
                        );
                    }
                } else {
                    // Peran Pegawai: Akumulasikan/Gabungkan ke kuesioner Owner

                    // 1. Record employee submission to track that they have submitted
                    DB::execute(
                        'INSERT INTO submissions
                           (user_id,role,status,validation_pass,
                            score_ins,score_ov,score_ldi,score_weq,score_ops,score_ect,
                            score_composite,score_on_5,health_category)
                         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
                        [
                            $auth['user_id'],
                            $role,
                            'submitted',
                            0, // validation_pass = 0 so it won't affect dashboard stats/lists/charts directly
                            null,
                            $result['scores']['OV']['normScore']  ?? null,
                            $result['scores']['LDI']['normScore'] ?? null,
                            $result['scores']['WEQ']['normScore'] ?? null,
                            null,
                            null,
                            $result['composite']['composite'] ?? null,
                            $result['composite']['scoreOn5']  ?? null,
                            $result['composite']['category']  ?? null,
                        ]
                    );

                    // 2. Hitung rata-rata skor semua pegawai di UMKM yang sama (termasuk yang baru saja di-insert)
                    $empAvg = DB::fetchOne(
                        'SELECT 
                           AVG(s.score_ov) AS avg_ov,
                           AVG(s.score_ldi) AS avg_ldi,
                           AVG(s.score_weq) AS avg_weq
                         FROM submissions s
                         JOIN users u ON s.user_id = u.id
                         WHERE LOWER(TRIM(u.umkm_name)) = LOWER(TRIM(?)) AND s.role = "employee"',
                        [$auth['umkm_name']]
                    );

                    $submissionId = (int)$ownerSubmission['id'];

                    // Hitung gabungan factorResults dengan rata-rata akumulasi pegawai
                    $combinedFactorResults = [
                        'INS' => ['normScore' => $ownerSubmission['score_ins']],
                        'OPS' => ['normScore' => $ownerSubmission['score_ops']],
                        'ECT' => ['normScore' => $ownerSubmission['score_ect']],
                        'OV'  => ['normScore' => $empAvg['avg_ov']  !== null ? round((float)$empAvg['avg_ov'], 4)  : null],
                        'LDI' => ['normScore' => $empAvg['avg_ldi'] !== null ? round((float)$empAvg['avg_ldi'], 4) : null],
                        'WEQ' => ['normScore' => $empAvg['avg_weq'] !== null ? round((float)$empAvg['avg_weq'], 4) : null],
                    ];

                    $composite = Validator::computeComposite($combinedFactorResults);

                    // 3. Update submissions header milik Owner dengan hasil akumulasi gabungan
                    DB::execute(
                        'UPDATE submissions
                         SET score_ov = ?,
                             score_ldi = ?,
                             score_weq = ?,
                             score_composite = ?,
                             score_on_5 = ?,
                             health_category = ?,
                             status = "validated",
                             validation_pass = 1
                         WHERE id = ?',
                        [
                            $combinedFactorResults['OV']['normScore'],
                            $combinedFactorResults['LDI']['normScore'],
                            $combinedFactorResults['WEQ']['normScore'],
                            $composite['composite'] ?? null,
                            $composite['scoreOn5']  ?? null,
                            $composite['category']  ?? null,
                            $submissionId
                        ]
                    );

                    // 4. Insert/Update jawaban individual
                    foreach ($result['clean_data']['answers'] as $qId => $val) {
                        $fKey = strtoupper(explode('_',$qId)[0]);
                        $code = $factorSchema[$fKey]['codes'][$qId] ?? '';
                        $max  = $factorSchema[$fKey]['max']         ?? 5;
                        DB::execute(
                            'INSERT INTO answers (submission_id,factor_key,question_id,question_code,answer_value,scale_max)
                             VALUES (?,?,?,?,?,?)
                             ON DUPLICATE KEY UPDATE answer_value = ?',
                            [$submissionId, $fKey, $qId, $code, $val, $max, $val]
                        );
                    }

                    // 3. Insert validation log
                    foreach (array_merge(
                        array_map(fn($e)=>array_merge($e,['level'=>'error']),   $result['errors']),
                        array_map(fn($w)=>array_merge($w,['level'=>'warning']), $result['warnings'])
                    ) as $log) {
                        DB::execute(
                            'INSERT INTO validation_log
                               (submission_id,level,factor_key,field_name,error_code,message)
                             VALUES (?,?,?,?,?,?)',
                            [
                                $submissionId,
                                $log['level'],
                                $log['factor'] ?? null,
                                $log['field']  ?? null,
                                $log['code'],
                                $log['message'],
                            ]
                        );
                    }

                    // Gabungkan scores untuk response agar frontend menampilkan hasil lengkap yang disatukan
                    $combinedScores = [
                        'INS' => [
                            'normScore' => $ownerSubmission['score_ins'],
                            'scoreOn5'  => $ownerSubmission['score_ins'] !== null ? round($ownerSubmission['score_ins'] * 5, 2) : null,
                        ],
                        'OPS' => [
                            'normScore' => $ownerSubmission['score_ops'],
                            'scoreOn5'  => $ownerSubmission['score_ops'] !== null ? round($ownerSubmission['score_ops'] * 5, 2) : null,
                        ],
                        'ECT' => [
                            'normScore' => $ownerSubmission['score_ect'],
                            'scoreOn5'  => $ownerSubmission['score_ect'] !== null ? round($ownerSubmission['score_ect'] * 5, 2) : null,
                        ],
                        'OV'  => [
                            'normScore' => $combinedFactorResults['OV']['normScore'],
                            'scoreOn5'  => $combinedFactorResults['OV']['normScore'] !== null ? round($combinedFactorResults['OV']['normScore'] * 5, 2) : null,
                        ],
                        'LDI' => [
                            'normScore' => $combinedFactorResults['LDI']['normScore'],
                            'scoreOn5'  => $combinedFactorResults['LDI']['normScore'] !== null ? round($combinedFactorResults['LDI']['normScore'] * 5, 2) : null,
                        ],
                        'WEQ' => [
                            'normScore' => $combinedFactorResults['WEQ']['normScore'],
                            'scoreOn5'  => $combinedFactorResults['WEQ']['normScore'] !== null ? round($combinedFactorResults['WEQ']['normScore'] * 5, 2) : null,
                        ],
                    ];
                    $result['scores'] = $combinedScores;
                }

                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                respond(false, null,
                    APP_DEBUG ? 'Database error: '.$e->getMessage() : 'Gagal menyimpan data.',
                    500);
            }

            if ($role === 'owner' && !$result['valid']) {
                respond(false, [
                    'errors'        => $result['errors'],
                    'warnings'      => $result['warnings'],
                    'submission_id' => $submissionId,
                ], 'Formulir ditolak: '.count($result['errors']).' error ditemukan.', 422);
            }

            respond(true, [
                'submission_id' => $submissionId,
                'scores'        => $result['scores'],
                'composite'     => $composite ?? $result['composite'],
                'warnings'      => $result['warnings'],
            ], 'Formulir berhasil disimpan.');
        })(),

        // ── GET /api.php?action=dashboard ─────────────────────
        $action === 'dashboard' && $method === 'GET' => (function () {
            requireAuth();
            $stats = DB::fetchOne(
                'SELECT
                   COUNT(*) AS total_umkm,
                   SUM(validation_pass = 1) AS total_valid,
                   ROUND(AVG(score_composite)*100, 1) AS avg_score_pct,
                   ROUND(MAX(score_composite)*5, 2) AS best_score,
                   ROUND(MIN(score_composite)*5, 2) AS worst_score,
                   SUM(score_composite >= 0.6) AS sehat_count
                 FROM submissions WHERE validation_pass = 1'
            );
            $factorAvg = DB::fetchOne(
                'SELECT * FROM v_factor_averages'
            );
            if ($factorAvg) {
                $factorAvg['avg_ins_5'] = round(($factorAvg['avg_ins'] ?? 0) * 5, 2);
                $factorAvg['avg_ov_5']  = round(($factorAvg['avg_ov'] ?? 0) * 5, 2);
                $factorAvg['avg_ldi_5'] = round(($factorAvg['avg_ldi'] ?? 0) * 5, 2);
                $factorAvg['avg_weq_5'] = round(($factorAvg['avg_weq'] ?? 0) * 5, 2);
                $factorAvg['avg_ops_5'] = round(($factorAvg['avg_ops'] ?? 0) * 5, 2);
                $factorAvg['avg_ect_5'] = round(($factorAvg['avg_ect'] ?? 0) * 5, 2);
            }
            respond(true, ['stats'=>$stats, 'factor_averages'=>$factorAvg]);
        })(),

        // ── GET /api.php?action=umkm_list ─────────────────────
        $action === 'umkm_list' && $method === 'GET' => (function () {
            requireAuth();
            $limit  = min((int)($_GET['limit'] ?? PAGE_LIMIT_DEFAULT), PAGE_LIMIT_MAX);
            $offset = (int)($_GET['offset'] ?? 0);
            $search = '%'.($_GET['search'] ?? '').'%';

            $rows = DB::fetchAll(
                'SELECT s.submission_id, s.umkm_name, s.lokasi, s.sektor, s.role,
                        s.score_composite, s.score_on_5, s.health_category, s.submitted_at, u.omzet
                 FROM v_submission_summary s
                 LEFT JOIN users u ON s.user_id = u.id
                 WHERE s.validation_pass = 1
                   AND (s.umkm_name LIKE ? OR s.lokasi LIKE ? OR s.sektor LIKE ?)
                 ORDER BY s.submitted_at ASC
                 LIMIT ? OFFSET ?',
                [$search, $search, $search, $limit, $offset]
            );
            $total = DB::fetchOne(
                'SELECT COUNT(*) as cnt FROM v_submission_summary
                 WHERE validation_pass = 1
                   AND (umkm_name LIKE ? OR lokasi LIKE ? OR sektor LIKE ?)',
                [$search, $search, $search]
            );
            respond(true, ['rows'=>$rows, 'total'=>(int)($total['cnt']??0), 'limit'=>$limit, 'offset'=>$offset]);
        })(),

        // ── GET /api.php?action=factor_averages ───────────────
        $action === 'factor_averages' && $method === 'GET' => (function () {
            requireAuth();
            $data = DB::fetchOne('SELECT * FROM v_factor_averages');
            if ($data) {
                $data['avg_ins_5'] = round(($data['avg_ins'] ?? 0) * 5, 2);
                $data['avg_ov_5']  = round(($data['avg_ov'] ?? 0) * 5, 2);
                $data['avg_ldi_5'] = round(($data['avg_ldi'] ?? 0) * 5, 2);
                $data['avg_weq_5'] = round(($data['avg_weq'] ?? 0) * 5, 2);
                $data['avg_ops_5'] = round(($data['avg_ops'] ?? 0) * 5, 2);
                $data['avg_ect_5'] = round(($data['avg_ect'] ?? 0) * 5, 2);
            }
            respond(true, $data);
        })(),

        // ── 404 ───────────────────────────────────────────────
        default => respond(false, null, "Endpoint '$action' tidak ditemukan.", 404),
    };

} catch (Throwable $e) {
    respond(false, APP_DEBUG ? ['trace'=>$e->getMessage()] : null,
        'Terjadi kesalahan server.', 500);
}