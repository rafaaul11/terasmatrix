-- ============================================================
--  TerasMatrix Database Schema
--  Engine : MySQL 8.0+ / MariaDB 10.5+
--  Charset: utf8mb4_unicode_ci
--
--  IMPORT VIA PhpMyAdmin:
--    Database > Import > pilih file ini > Execute
--
--  CATATAN: Semua data lama TIDAK dihapus.
--  Script menggunakan CREATE TABLE IF NOT EXISTS dan
--  ALTER TABLE ADD COLUMN IF NOT EXISTS agar aman dijalankan
--  berulang kali tanpa merusak data yang sudah ada.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+07:00';

-- ============================================================
--  1. TABEL USERS  (akun login owner & pegawai)
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `umkm_name`    VARCHAR(150)    NOT NULL                    COMMENT 'Nama resmi bisnis / UMKM',
  `email`        VARCHAR(180)    NOT NULL                    COMMENT 'Email bisnis (unik)',
  `password_hash`VARCHAR(255)    NOT NULL                    COMMENT 'bcrypt hash',
  `role`         ENUM('owner','employee') NOT NULL           COMMENT 'Peran responden',
  `lokasi`       VARCHAR(100)    DEFAULT NULL                COMMENT 'Provinsi / kota',
  `sektor`       VARCHAR(80)     DEFAULT NULL                COMMENT 'Bidang industri',
  `omzet`        BIGINT UNSIGNED DEFAULT NULL                COMMENT 'Omzet per bulan (IDR)',
  `is_active`    TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_sektor` (`sektor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Akun pengguna TerasMatrix (owner & pegawai)';


-- ============================================================
--  2. TABEL SUBMISSIONS  (satu baris = satu pengiriman formulir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `submissions` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         INT UNSIGNED NOT NULL                 COMMENT 'FK → users.id',
  `role`            ENUM('owner','employee') NOT NULL     COMMENT 'Peran saat submit',
  `status`          ENUM('draft','submitted','validated','rejected')
                                NOT NULL DEFAULT 'submitted',
  `validation_pass` TINYINT(1)  NOT NULL DEFAULT 0        COMMENT '1 = lolos validasi backend',
  `submitted_at`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `validated_at`    DATETIME    DEFAULT NULL,
  `notes`           TEXT        DEFAULT NULL              COMMENT 'Catatan validator / admin',

  -- ── Skor per Faktor (dinormalisasi 0.0000–1.0000) ──────
  `score_ins`   DECIMAL(5,4) DEFAULT NULL COMMENT 'Sumber Daya   — INS (owner)',
  `score_ov`    DECIMAL(5,4) DEFAULT NULL COMMENT 'Budaya        — OV  (employee)',
  `score_ldi`   DECIMAL(5,4) DEFAULT NULL COMMENT 'Kepemimpinan  — LDI (employee)',
  `score_weq`   DECIMAL(5,4) DEFAULT NULL COMMENT 'Proses        — WEQ (employee)',
  `score_ops`   DECIMAL(5,4) DEFAULT NULL COMMENT 'Inovasi       — OPS (owner)',
  `score_ect`   DECIMAL(5,4) DEFAULT NULL COMMENT 'Eksternal     — ECT (owner)',
  `score_composite` DECIMAL(5,4) DEFAULT NULL            COMMENT 'Skor komposit tertimbang 0–1',
  `score_on_5`  DECIMAL(4,2) DEFAULT NULL                COMMENT 'Skor komposit skala 0–5',
  `health_category` VARCHAR(30) DEFAULT NULL             COMMENT 'SANGAT BAIK / BAIK / CUKUP / PERLU PERHATIAN',

  PRIMARY KEY (`id`),
  KEY `idx_user`   (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_submitted` (`submitted_at`),
  CONSTRAINT `fk_sub_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Header setiap pengiriman formulir SiSEHAT';


-- ============================================================
--  3. TABEL ANSWERS  (jawaban individual per pertanyaan)
--     Satu baris = satu jawaban untuk satu pertanyaan
-- ============================================================
CREATE TABLE IF NOT EXISTS `answers` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `submission_id` INT UNSIGNED NOT NULL                   COMMENT 'FK → submissions.id',
  `factor_key`    ENUM('INS','OV','LDI','WEQ','OPS','ECT') NOT NULL COMMENT 'Faktor kesehatan',
  `question_id`   VARCHAR(20)  NOT NULL                   COMMENT 'ID soal: ins_oh1 … weq_oh17',
  `question_code` VARCHAR(10)  NOT NULL                   COMMENT 'Kode codebook: OH-1 … OH-35',
  `answer_value`  TINYINT      NOT NULL                   COMMENT 'Nilai jawaban (1–5 atau 1–3)',
  `scale_max`     TINYINT      NOT NULL                   COMMENT 'Batas atas skala (3 atau 5)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sub_question` (`submission_id`, `question_id`),
  KEY `idx_factor`   (`factor_key`),
  KEY `idx_qid`      (`question_id`),
  CONSTRAINT `fk_ans_sub` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_answer_range` CHECK (`answer_value` >= 1 AND `answer_value` <= `scale_max`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Jawaban per pertanyaan tiap submission';


-- ============================================================
--  4. TABEL VALIDATION_LOG  (log hasil validasi backend)
-- ============================================================
CREATE TABLE IF NOT EXISTS `validation_log` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `submission_id` INT UNSIGNED NOT NULL,
  `level`         ENUM('error','warning','info') NOT NULL,
  `factor_key`    VARCHAR(10)  DEFAULT NULL,
  `field_name`    VARCHAR(30)  DEFAULT NULL,
  `error_code`    VARCHAR(40)  NOT NULL,
  `message`       TEXT         NOT NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vlog_sub`   (`submission_id`),
  KEY `idx_vlog_level` (`level`),
  CONSTRAINT `fk_vlog_sub` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Log error & warning dari proses validasi';


-- ============================================================
--  5. TABEL FACTOR_DEFINITIONS  (referensi statis 6 faktor)
--     Data ini digunakan oleh dashboard untuk labeling.
-- ============================================================
CREATE TABLE IF NOT EXISTS `factor_definitions` (
  `key`         VARCHAR(5)   NOT NULL,
  `label`       VARCHAR(80)  NOT NULL,
  `role`        ENUM('owner','employee') NOT NULL,
  `weight`      DECIMAL(4,2) NOT NULL COMMENT 'Bobot dalam skor komposit (total = 1.00)',
  `scale_max`   TINYINT      NOT NULL,
  `description` VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Definisi 6 faktor SiSEHAT (data referensi)';

-- Insert referensi faktor — gunakan INSERT IGNORE agar tidak
-- menimpa jika sudah ada
INSERT IGNORE INTO `factor_definitions`
  (`key`, `label`, `role`, `weight`, `scale_max`, `description`) VALUES
('INS', 'Sumber Daya — Institutional Resources', 'owner',    0.20, 3, 'Ketersediaan sumber daya kelembagaan dan dukungan eksternal'),
('OV',  'Budaya — Organizational Values',        'employee', 0.18, 5, 'Nilai-nilai organisasi, budaya, dan integritas lingkungan kerja'),
('LDI', 'Kepemimpinan — Leader Involvement',     'employee', 0.17, 5, 'Keterlibatan aktif manajemen dalam operasional dan pengembangan SDM'),
('WEQ', 'Proses — Work Environment Quality',     'employee', 0.15, 5, 'Kualitas lingkungan dan proses kerja yang mendukung produktivitas'),
('OPS', 'Inovasi — Operational Stability',       'owner',    0.15, 5, 'Stabilitas operasional dan kemampuan bisnis mengelola proses harian'),
('ECT', 'Eksternal — Economic Connectivity',     'owner',    0.15, 5, 'Kinerja ekonomi dan konektivitas bisnis dengan pasar eksternal');


-- ============================================================
--  6. TABEL QUESTION_DEFINITIONS  (referensi statis 35 soal)
-- ============================================================
CREATE TABLE IF NOT EXISTS `question_definitions` (
  `id`          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_id` VARCHAR(20)  NOT NULL,
  `code`        VARCHAR(10)  NOT NULL,
  `factor_key`  VARCHAR(5)   NOT NULL,
  `text_id`     TEXT         NOT NULL COMMENT 'Teks Bahasa Indonesia',
  `text_en`     TEXT         NOT NULL COMMENT 'Teks Bahasa Inggris',
  `scale_max`   TINYINT      NOT NULL,
  `is_required` TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`  SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_qid`  (`question_id`),
  UNIQUE KEY `uq_code` (`code`),
  KEY `idx_factor` (`factor_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Definisi 35 pertanyaan SiSEHAT (data referensi)';

INSERT IGNORE INTO `question_definitions`
  (`question_id`,`code`,`factor_key`,`text_id`,`text_en`,`scale_max`,`sort_order`) VALUES
-- INS (Owner, skala 1–3)
('ins_oh1','OH-1','INS','Apakah bisnis Anda memiliki Nomor Induk Berusaha (NIB)?','Does your business have a Business Identification Number (NIB)?',3,1),
('ins_oh2','OH-2','INS','Apakah Anda pernah menerima bantuan pendanaan dari pemerintah?','Have you received any government funding assistance?',3,2),
('ins_oh3','OH-3','INS','Apakah Anda pernah mengikuti kegiatan yang diselenggarakan pemerintah?','Have you participated in government-organized activities?',3,3),
('ins_oh4','OH-4','INS','Apakah Anda berkolaborasi dengan pedagang atau bisnis lain?','Do you collaborate with other merchants or businesses?',3,4),
('ins_oh5','OH-5','INS','Apakah Anda menggunakan pemasaran digital?','Do you use digital marketing?',3,5),
('ins_oh6','OH-6','INS','Apa sumber modal keuangan utama bisnis Anda?','What is the primary source of financial capital?',3,6),
-- OV (Employee, skala 1–5)
('ov_oh18','OH-18','OV','Saya merasa bebas membicarakan kesulitan kerja dengan pemimpin atau rekan','I feel free to talk about work-related difficulties with my leader or colleagues',5,7),
('ov_oh19','OH-19','OV','Suasana di tempat kerja saya positif dan mendukung','The atmosphere in my workplace is positive and supportive',5,8),
('ov_oh20','OH-20','OV','Semangat kerja karyawan di tempat kerja saya umumnya tinggi','The morale of employees in my workplace is generally high',5,9),
('ov_oh21','OH-21','OV','Karyawan di tempat kerja saya saling membantu saat dibutuhkan','Employees in my workplace help each other when needed',5,10),
('ov_oh22','OH-22','OV','Tingkat kepercayaan antar karyawan di tempat kerja saya sangat kuat','The level of trust among employees in my workplace is very strong',5,11),
('ov_oh23','OH-23','OV','Kerja tim di tempat kerja saya sangat efektif','Teamwork in my workplace is effective',5,12),
('ov_oh24','OH-24','OV','Karyawan di tempat kerja saya saling menghormati','Employees in my workplace treat each other with respect',5,13),
('ov_oh25','OH-25','OV','Karyawan di tempat kerja saya memandang pekerjaan sebagai bentuk dedikasi','Employees view their work as a form of dedication',5,14),
-- LDI (Employee, skala 1–5)
('ldi_oh7','OH-7','LDI','Pemimpin Anda terhubung dengan karyawan secara personal','Your leader connects to employees on a personal level',5,15),
('ldi_oh8','OH-8','LDI','Pemimpin Anda bertindak sebagai panutan bagi karyawan','Your leader acts as a role model for employees',5,16),
('ldi_oh9','OH-9','LDI','Pemimpin Anda terbuka untuk menerapkan ide atau saran dari karyawan','Your leader is open to implementing ideas or suggestions from employees',5,17),
('ldi_oh10','OH-10','LDI','Pemimpin Anda terlibat langsung dalam pekerjaan sehari-hari','Your leader is directly involved in day-to-day work',5,18),
('ldi_oh11','OH-11','LDI','Pemimpin Anda aktif berpartisipasi dalam melatih karyawan baru','Your leader actively participates in training new employees',5,19),
('ldi_oh12','OH-12','LDI','Pemimpin Anda memperlakukan karyawan secara adil','Your leader treats employees fairly when giving punishments and rewards',5,20),
-- WEQ (Employee, skala 1–5)
('weq_oh13','OH-13','WEQ','Tempat kerja bebas dari kecelakaan kerja','Workplace is free from job-related accidents',5,21),
('weq_oh14','OH-14','WEQ','Saya puas dengan jam kerja yang ditetapkan di perusahaan ini','I am satisfied with the working hours set in this company',5,22),
('weq_oh15','OH-15','WEQ','Beban kerja saya dapat dikelola dengan baik','My workload is manageable',5,23),
('weq_oh16','OH-16','WEQ','Kondisi kerja fisik (kebisingan, pencahayaan, suhu) nyaman','The physical working conditions are comfortable',5,24),
('weq_oh17','OH-17','WEQ','Sebagian besar karyawan bertanggung jawab dan jarang absen tanpa alasan sah','Most employees are responsible and rarely miss work without valid reasons',5,25),
-- OPS (Owner, skala 1–5)
('ops_oh26','OH-26','OPS','Modal kerja mencukupi untuk operasional bisnis sehari-hari','Working capital is adequate for daily business operations',5,26),
('ops_oh27','OH-27','OPS','Perusahaan mampu membayar gaji karyawan tepat waktu','The company is able to pay employee salaries on time',5,27),
('ops_oh28','OH-28','OPS','Peralatan/mesin dalam kondisi baik dan berfungsi optimal','The equipment/machinery is in good condition and functions optimally',5,28),
('ops_oh29','OH-29','OPS','Rantai pasokan bisnis berjalan lancar tanpa gangguan signifikan','The business supply chain runs smoothly without significant disruptions',5,29),
('ops_oh30','OH-30','OPS','Permintaan produk/jasa dapat diprediksi dengan baik','The demand for products/services is predictable',5,30),
('ops_oh31','OH-31','OPS','Kualitas hubungan jangka panjang bisnis dengan pelanggan sangat baik','The quality of long-term relationships with customers',5,31),
-- ECT (Owner, skala 1–5)
('ect_oh32','OH-32','ECT','Kemampuan bisnis kami menjangkau pasar atau pelanggan baru sangat baik',"Our business's ability to reach new markets or customers is excellent",5,32),
('ect_oh33','OH-33','ECT','Pertumbuhan penjualan bisnis kami selama setahun terakhir sangat memuaskan',"Our business's sales growth over the past year has been very satisfactory",5,33),
('ect_oh34','OH-34','ECT','Liabilitas bisnis kami (pinjaman, utang) sangat dapat dikelola',"Our business's liabilities are very manageable",5,34),
('ect_oh35','OH-35','ECT','Situasi arus kas bisnis kami sangat sehat dan stabil',"Our business's cash flow situation is very healthy and stable",5,35);


-- ============================================================
--  7. VIEW  — ringkasan skor per submission (untuk dashboard)
-- ============================================================
CREATE OR REPLACE VIEW `v_submission_summary` AS
SELECT
  s.id                AS submission_id,
  u.id                AS user_id,
  u.umkm_name,
  u.email,
  u.lokasi,
  u.sektor,
  s.role,
  s.status,
  s.validation_pass,
  s.submitted_at,
  s.score_ins,
  s.score_ov,
  s.score_ldi,
  s.score_weq,
  s.score_ops,
  s.score_ect,
  s.score_composite,
  s.score_on_5,
  s.health_category
FROM submissions s
JOIN users u ON u.id = s.user_id;


-- ============================================================
--  8. VIEW  — rata-rata skor per faktor (untuk halaman Home)
-- ============================================================
CREATE OR REPLACE VIEW `v_factor_averages` AS
SELECT
  ROUND(AVG(score_ins), 4)       AS avg_ins,
  ROUND(AVG(score_ov),  4)       AS avg_ov,
  ROUND(AVG(score_ldi), 4)       AS avg_ldi,
  ROUND(AVG(score_weq), 4)       AS avg_weq,
  ROUND(AVG(score_ops), 4)       AS avg_ops,
  ROUND(AVG(score_ect), 4)       AS avg_ect,
  ROUND(AVG(score_composite), 4) AS avg_composite,
  COUNT(*)                        AS total_submissions
FROM submissions
WHERE validation_pass = 1;


SET FOREIGN_KEY_CHECKS = 1;
