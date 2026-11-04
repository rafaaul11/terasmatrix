# ARCHITECTURE.md — TerasMatrix

## Gambaran Umum

**TerasMatrix** adalah platform analitik kesehatan organisasi untuk UMKM berbasis web. Aplikasi ini memungkinkan pemilik UMKM dan pegawainya mengisi formulir penilaian **6 faktor kesehatan organisasi** (OH-Index), lalu menampilkan skor, dashboard, dan perbandingan antar UMKM secara real-time.

Platform ini di-hosting di **InfinityFree** dengan arsitektur monolitik sederhana: satu halaman PHP sebagai frontend SPA, dan satu file PHP sebagai REST API backend.

## Menjalankan Secara Lokal

Jalankan server PHP dari folder project:

```powershell
php -S 127.0.0.1:8000 -t .
```

Buka `http://127.0.0.1:8000/html/` atau `http://127.0.0.1:8000/Frontend/`. Jika frontend dibuka melalui VS Code Live Server (port 5500), API akan diarahkan ke server PHP di port 8000. Pastikan PHP dan MySQL aktif.

---

## Struktur Direktori

```
nexaumkm/
├── index.php               # Frontend — Single Page Application (SPA)
├── .htaccess               # Routing frontend + konfigurasi PHP
│
├── css/
│   ├── auth.css            # Styling halaman login & register
│   └── main.css            # Styling dashboard, form, dan komponen utama
│
├── js/
│   ├── api.js              # HTTP client — komunikasi ke backend API
│   ├── auth.js             # Logic autentikasi (login, register, logout)
│   ├── form.js             # Logic formulir 6 faktor & validasi sisi klien
│   └── main.js             # Inisialisasi app, router view, Chart.js dashboard
│
└── backend/
    ├── api.php             # REST API — single-file router (semua endpoint)
    ├── .htaccess           # Blokir akses langsung ke subfolder php/
    └── php/
        ├── config.php      # Konstanta konfigurasi (DB, JWT, CORS, dsb.)
        ├── db.php          # Singleton PDO wrapper (DB::fetchAll, fetchOne, execute)
        └── validator.php   # Validasi input server-side untuk semua endpoint
```

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Client)                   │
│                                                      │
│  index.php (SPA)                                     │
│  ├── auth.css / main.css   — styling                 │
│  ├── api.js                — HTTP fetch wrapper      │
│  ├── auth.js               — login / register flow   │
│  ├── form.js               — formulir OH-Index       │
│  └── main.js               — view router + Chart.js  │
└────────────────────┬────────────────────────────────┘
                     │  HTTP/JSON  (JWT Bearer Token)
                     ▼
┌─────────────────────────────────────────────────────┐
│              Backend — InfinityFree PHP              │
│                                                      │
│  backend/api.php  (single-file REST router)          │
│  ├── php/config.php   — env constants                │
│  ├── php/db.php       — PDO singleton                │
│  └── php/validator.php — input validation            │
└────────────────────┬────────────────────────────────┘
                     │  PDO / MySQL
                     ▼
┌─────────────────────────────────────────────────────┐
│         Database — MySQL (InfinityFree)              │
│                                                      │
│  Tabel utama:                                        │
│  ├── users          — akun pemilik & pegawai UMKM   │
│  ├── submissions    — hasil penilaian + skor 6 faktor│
│  └── answers        — jawaban per pertanyaan OH      │
└─────────────────────────────────────────────────────┘
```

---

## REST API Endpoints

Semua endpoint menggunakan satu entry point: `backend/api.php?action=<nama_action>`

| Method | Action              | Auth Required | Deskripsi                                      |
|--------|---------------------|:-------------:|------------------------------------------------|
| POST   | `register`          | ✗             | Daftar akun baru (owner / employee)            |
| POST   | `login`             | ✗             | Login, mendapatkan JWT token                   |
| POST   | `submit`            | ✓             | Kirim formulir penilaian 6 faktor OH-Index     |
| GET    | `submissions`       | ✓             | Daftar riwayat submission milik user sendiri   |
| GET    | `dashboard`         | ✓             | Data agregat untuk dashboard (skor rata-rata)  |
| GET    | `umkm_list`         | ✓             | Tabel daftar UMKM beserta skor komposit        |
| GET    | `factor_averages`   | ✓             | Rata-rata skor per faktor (untuk chart radar)  |

### Autentikasi
- Menggunakan **JWT (JSON Web Token)** dengan algoritma HS256.
- Token dikirim via header: `Authorization: Bearer <token>`.
- Masa berlaku token: **8 jam** (dikonfigurasi di `JWT_EXPIRE`).

---

## 6 Faktor Kesehatan Organisasi (OH-Index)

Penilaian menggunakan **33 pertanyaan** yang dikelompokkan ke dalam 6 faktor:

| Kode  | Nama Faktor              | Kode Pertanyaan    | Skala Maks |
|-------|--------------------------|--------------------|:----------:|
| `INS` | Institutional (Kelembagaan) | OH-1 s/d OH-6  | 3          |
| `OV`  | Organizational Values    | OH-18 s/d OH-25    | 5          |
| `LDI` | Leadership & Decision    | OH-7 s/d OH-12     | 5          |
| `WEQ` | Workforce Equity         | OH-13 s/d OH-17    | 5          |
| `OPS` | Operational Systems      | OH-26 s/d OH-31    | 5          |
| `ECT` | External & Compliance    | OH-32 s/d OH-35    | 5          |

Skor tiap faktor dinormalisasi ke skala 0–5, kemudian digabungkan menjadi **skor komposit** dan dikategorikan sebagai label kesehatan organisasi (health_category).

---

## Alur Data Utama

### Alur Submit Penilaian (Owner)
```
User isi form  →  form.js validasi client-side
               →  api.js POST /api.php?action=submit (+ JWT)
               →  validator.php validasi server-side
               →  Hitung skor 6 faktor & komposit
               →  INSERT ke tabel submissions & answers
               →  Return skor + health_category ke frontend
               →  main.js tampilkan hasil di dashboard
```

### Alur Submit Penilaian (Pegawai)
```
User isi form  →  (sama seperti owner, namun role = 'employee')
               →  Skor pegawai dirata-rata dengan skor owner UMKM yang sama
               →  Skor komposit UMKM diperbarui
```

---

## Teknologi yang Digunakan

| Layer      | Teknologi                        |
|------------|----------------------------------|
| Frontend   | PHP (template SPA), Vanilla JS, CSS |
| Charting   | Chart.js 4.4.1 (CDN)            |
| Backend    | PHP (single-file REST API)       |
| Database   | MySQL 5.7+ via PDO               |
| Auth       | JWT HS256 (implementasi native)  |
| Hosting    | InfinityFree (shared hosting)    |
| Web Server | Apache (.htaccess + mod_rewrite) |
| Font       | Plus Jakarta Sans (Google Fonts) |

---

## Catatan Keamanan

- File `backend/php/` diblokir akses langsung via `.htaccess`.
- Password database dan `JWT_SECRET` disimpan di `config.php` (jangan di-commit ke repositori publik; gunakan file `.env` sebagai referensi).
- Query database menggunakan **prepared statements (PDO)** untuk mencegah SQL Injection.
- `APP_DEBUG=false` di production untuk menyembunyikan pesan error internal.
