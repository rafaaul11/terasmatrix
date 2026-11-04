const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream('html/Panduan_Pengisian_SiSEHAT.pdf'));

doc.fontSize(24).fillColor('#1a56db').text('Panduan Pengisian SiSEHAT', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(12).fillColor('#4b5563').text('Sistem Asesmen Kesehatan Ekosistem UMKM', { align: 'center' });
doc.moveDown(2);

doc.fontSize(16).fillColor('#111827').text('1. Aturan Pengisian (Pegawai vs Pemilik)');
doc.moveDown(0.5);
doc.fontSize(12).fillColor('#374151');
doc.text('Sistem telah membagi kewajiban pengisian formulir ke dalam dua peran berbeda untuk memastikannya tepat sasaran:');
doc.moveDown(0.5);
doc.list([
  'Pemilik (Owner): Hanya mengisi blok pertanyaan untuk Pilar INS (Institutional Resources / Sumber Daya) dan ECT (Economic Connectivity / Eksternal).',
  'Pegawai (Employee): Mengisi blok pertanyaan untuk Pilar LDI (Kepemimpinan), WEQ (Kualitas Lingkungan Kerja), OV (Nilai Organisasi/Budaya), dan OPS (Inovasi & Operasional).'
], { bulletRadius: 2 });

doc.moveDown(2);

doc.fontSize(16).fillColor('#111827').text('2. Penilaian dan Skor');
doc.moveDown(0.5);
doc.fontSize(12).fillColor('#374151');
doc.text('Pastikan setiap kolom diisi secara jujur berdasarkan kenyataan di lapangan. Berikut cara sistem memberikan skor:');
doc.moveDown(0.5);
doc.list([
  'Skala yang digunakan adalah 1 sampai 5. (1 = Sangat Buruk/Tidak Setuju, 5 = Sangat Baik/Sangat Setuju).',
  'Akumulasi metrik dari seluruh pilar akan disintesiskan ke dalam bentuk nilai komposit.',
  'Pilar dengan nilai kurang dari 2.5 akan menyala merah di Dasbor dan membutuhkan Intervensi Segera.'
], { bulletRadius: 2 });

doc.moveDown(2);

doc.fontSize(16).fillColor('#111827').text('3. Cara Mendaftar');
doc.moveDown(0.5);
doc.fontSize(12).fillColor('#374151');
doc.text('1. Buka laman utama dan klik tombol "Tambah Data".');
doc.text('2. Di halaman awal, isikan nama UMKM Anda beserta Lokasi, Omzet, dan pilih 1 dari 3 Sektor yang tersedia: Makanan & Minuman, Fashion, atau Grosir & Retail.');
doc.text('3. Pastikan Anda memilih Peran (Owner/Pegawai) yang sesuai sebelum menekan tombol "Mulai Evaluasi".');
doc.text('4. Jawab seluruh kuesioner yang muncul dan tekan Simpan.');

doc.moveDown(3);
doc.fontSize(10).fillColor('#9ca3af').text('Panduan ini di-generate otomatis oleh TerasMatrix System pada: ' + new Date().toISOString().split('T')[0], { align: 'center' });

doc.end();
console.log("PDF Created.");
