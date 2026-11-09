# Panduan setup Supabase TerasMatrix

## 1. Buat proyek Supabase

1. Masuk ke [supabase.com](https://supabase.com), buat proyek baru, lalu simpan password database dengan aman.
2. Tunggu sampai proyek selesai dibuat.
3. Buka **Project Settings → API** (atau **API Keys**) dan salin **Project URL** serta **Publishable key**. Key lama bernama `anon` juga dapat digunakan.
4. Jangan pernah memakai atau menaruh `service_role` key di kode frontend.

## 2. Buat tabel dan kebijakan akses

1. Buka **SQL Editor → New query** pada proyek Supabase.
2. Salin seluruh isi [`backend/supabase/schema.sql`](./backend/supabase/schema.sql), lalu jalankan query tersebut.
3. Pastikan query selesai tanpa error. Script membuat tabel, data faktor dan pertanyaan, trigger profil saat akun dibuat, Row Level Security (RLS), serta fungsi untuk memvalidasi dan menyimpan penilaian.

Jalankan schema dengan akun proyek yang memiliki hak SQL admin. Jangan mematikan RLS pada tabel aplikasi.

## 3. Hubungkan aplikasi

Isi [`js/supabase-config.js`](./js/supabase-config.js) dengan URL dan Publishable key proyek:

```js
window.TERASMATRIX_SUPABASE = {
  url: 'https://PROJECT-REF.supabase.co',
  anonKey: 'sb_publishable_...',
};
```

Nilai tersebut memang digunakan di browser. Perlindungan akses data berasal dari RLS dan Auth, bukan dari menyembunyikan publishable key. Jangan menaruh password database atau `service_role` key di file ini.

## 4. Atur autentikasi email

Di Supabase, buka **Authentication → URL Configuration** dan masukkan URL website lokal/deployment ke **Site URL** serta daftar **Redirect URLs**.

Untuk pengujian lokal, matikan konfirmasi email sementara di **Authentication → Providers → Email**, atau konfirmasikan tautan yang dikirim sebelum mencoba login. Jika konfirmasi email aktif, aplikasi mengarahkan pengguna ke login setelah pendaftaran; akun belum dapat masuk sampai email dikonfirmasi.

## 5. Jalankan lokal

Jalankan dari folder proyek melalui PowerShell:

```powershell
php -S 127.0.0.1:8000 -t .
```

Buka `http://127.0.0.1:8000`. Jangan membuka `index.html` langsung sebagai file karena browser perlu memuat SDK Supabase dan file CSV melalui HTTP.

Atau gunakan Docker:

```powershell
docker build -t terasmatrix .
docker run --rm -p 8080:8080 terasmatrix
```

Buka `http://localhost:8080`. Isi konfigurasi Supabase sebelum menjalankan aplikasi.

## 6. Uji alur

1. Daftarkan akun dengan peran **Owner**, nama UMKM, lokasi, sektor, dan omzet.
2. Login sebagai Owner dan kirim semua pertanyaan pada formulir penilaian.
3. Dari halaman Profil Owner, salin **Kode Undangan Pegawai** dan bagikan kepada pegawai.
4. Daftarkan akun **Pegawai** menggunakan kode tersebut, lalu kirim penilaian setelah Owner.
5. Buka dashboard. Skor dan jawaban disimpan pada tabel `submissions` dan `answers`; akses hanya tersedia bagi pengguna terautentikasi yang terhubung ke UMKM tersebut.

## Catatan migrasi

Skema Supabase ini dimulai tanpa akun maupun rekaman lama. Akun lama perlu mendaftar ulang melalui Supabase Auth. Impor data historis dari MySQL tidak dilakukan otomatis: ekspor dan pemetaan akun/UUID perlu dikerjakan terpisah sebelum mengimpor hasil lama.
