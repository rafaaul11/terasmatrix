// ═══════════════════════════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════════════════════════
const AppState = {
  sidebarOpen:  true,
  currentUser:  null,
  chartsInit:   {},
  umkmData:     [],
  filteredData: [],
  currentPage:  1,
  pageSize:     6,
  activeFilter: 'semua',

  // Total UMKM — single source of truth
  get totalUmkm() {
    const dbCount = (this.umkmData || []).filter(x => x.isNew).length;
    return 428 + dbCount;
  },
  addUmkm() {
    return this.totalUmkm + 1;
  },
};

// ═══════════════════════════════════════════════════════════════
//  SIDEBAR  — hanya 1 hamburger di topbar, tidak ada di welcome-bar
// ═══════════════════════════════════════════════════════════════
function toggleSidebar() {
  AppState.sidebarOpen = !AppState.sidebarOpen;
  const sb = document.getElementById('sidebar');
  const tb = document.getElementById('topbar');
  const mn = document.getElementById('main');
  const ov = document.getElementById('sidebarOverlay');
  if (AppState.sidebarOpen) {
    sb.classList.remove('collapsed');
    tb.classList.remove('sidebar-closed');
    mn.classList.remove('sidebar-closed');
    ov.classList.remove('show');
  } else {
    sb.classList.add('collapsed');
    tb.classList.add('sidebar-closed');
    mn.classList.add('sidebar-closed');
    // Overlay hanya di mobile
    if (window.innerWidth < 900) ov.classList.add('show');
  }
}

function closeSidebar() {
  AppState.sidebarOpen = false;
  document.getElementById('sidebar')?.classList.add('collapsed');
  document.getElementById('topbar')?.classList.add('sidebar-closed');
  document.getElementById('main')?.classList.add('sidebar-closed');
  document.getElementById('sidebarOverlay')?.classList.remove('show');
}

// ═══════════════════════════════════════════════════════════════
//  NAVIGATE
// ═══════════════════════════════════════════════════════════════
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  window.scrollTo(0, 0);

  if (page === 'home')         { if (!AppState.chartsInit.home)         initHomeCharts(); }
  if (page === 'factor')       { if (!AppState.chartsInit.factor)       initSpiderChart(); }
  if (page === 'distribution') { if (!AppState.chartsInit.distribution) initDistCharts(); }
  if (page === 'comparison')   { if (!AppState.chartsInit.comparison)   initCompCharts(); }
  if (page === 'formdata')     { if (typeof resetAndBuildForm === 'function') resetAndBuildForm(); }
  if (page === 'umkmrec')      { renderUmkmTable(); }
  if (page === 'profile')      { renderProfilePage(); }
  if (page === 'notifications') { renderNotifications(); }

  applyDynamicData();

  if (page === 'home' || page === 'factor' || page === 'distribution' || page === 'comparison') loadDashboardData();
}

function renderNotifications() {
  const data = AppState.filteredData || AppState.umkmData || [];
  const total = data.length;
  
  const user = AppState.currentUser || { displayName: 'User' };
  safeSet('notif-halo', 'Halo, ' + user.displayName + '!');
  
  let insVal = '1.79';
  if (AppState.dashboardStats && AppState.dashboardStats.factor_averages && AppState.dashboardStats.factor_averages.avg_ins_5) {
    insVal = parseFloat(AppState.dashboardStats.factor_averages.avg_ins_5).toFixed(2);
  }

  let sum = 0;
  let scores5 = [];
  data.forEach(u => {
     let s5 = u.skor / 20;
     if (s5 === 0) s5 = 1.0;
     scores5.push(s5);
     sum += s5;
  });
  const mean = total > 0 ? sum / total : 0;
  let sumSq = 0;
  scores5.forEach(s => sumSq += (s - mean)*(s - mean));
  const sd = total > 0 ? Math.sqrt(sumSq / total) : 0;

  let outlierIDs = [];
  data.forEach(u => {
     let s5 = u.skor / 20;
     if (s5 === 0) s5 = 1.0;
     let z = sd === 0 ? 0 : Math.abs(s5 - mean) / sd;
     if (z > 2.5) outlierIDs.push(u.id);
  });
  
  let outlierText = '';
  if (outlierIDs.length > 0) {
      outlierText = ' (ID ' + outlierIDs.join(', ') + ')';
  }
  
  const listContainer = document.getElementById('notif-list-container');
  if (listContainer) {
    listContainer.innerHTML = `
        <div class="notif-item success">
          <div class="notif-item-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <div class="notif-item-content">
            <div class="notif-item-type">ANALISIS BERHASIL</div>
            <div class="notif-item-title">Analisis Selesai: Dataset ${total} UMKM</div>
            <div class="notif-item-desc">Laporan kesehatan organisasi untuk batch ${total} responden telah divalidasi. Nilai rata-rata INS (Sumber Daya) tercatat sebesar ${insVal.replace('.', ',')}.</div>
          </div>
          <div class="notif-item-time">2 mnt yang lalu</div>
        </div>

        <div class="notif-item danger">
          <div class="notif-item-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div class="notif-item-content">
            <div class="notif-item-type">PERINGATAN KRITIS</div>
            <div class="notif-item-title">Peringatan Distribusi: Outlier Terdeteksi</div>
            <div class="notif-item-desc">Ditemukan ${outlierIDs.length} UMKM dengan performa ekstrim${outlierText} yang berada jauh di atas rata-rata populasi. Segera tinjau anomali data.</div>
          </div>
          <div class="notif-item-time">45 mnt yang lalu</div>
        </div>

        <div class="notif-item primary">
          <div class="notif-item-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
          <div class="notif-item-content">
            <div class="notif-item-type">LAPORAN BARU</div>
            <div class="notif-item-title">Sistem: Skala Penilaian Diperbarui</div>
            <div class="notif-item-desc">Skala frekuensi distribusi kini telah disesuaikan menjadi 1-4 sesuai dengan standar pelaporan statistika terbaru.</div>
          </div>
          <div class="notif-item-time">2 jam yang lalu</div>
        </div>
    `;
  }
}

// ═══════════════════════════════════════════════════════════════
//  USER DISPLAY  — nama pengguna di topbar & seluruh halaman
// ═══════════════════════════════════════════════════════════════
function updateUserDisplay() {
  const user = AppState.currentUser;
  if (!user) return;

  // Pastikan nama tidak pernah "undefined" atau kosong
  const displayName = (user.umkm_name && user.umkm_name !== 'undefined')
    ? user.umkm_name
    : (user.name && user.name !== 'undefined')
      ? user.name
      : user.email
        ? user.email.split('@')[0]
        : 'Pengguna';

  // Simpan nama yang sudah dibersihkan
  AppState.currentUser.displayName = displayName;

  const av = document.getElementById('topbarAvatar');
  if (av) av.textContent = displayName[0].toUpperCase();
  const notifAv = document.getElementById('notifAvatar');
  if (notifAv) notifAv.textContent = displayName[0].toUpperCase();
  const helpAv = document.getElementById('helpAvatar');
  if (helpAv) helpAv.textContent = displayName[0].toUpperCase();

  const tn = document.getElementById('topbarName');
  if (tn) tn.textContent = displayName;

  // Ganti semua .welcome-name di seluruh halaman
  document.querySelectorAll('.welcome-name').forEach(el => {
    el.textContent = displayName;
  });

  // Role badge
  const rb = document.getElementById('topbarRole');
  if (rb) rb.textContent = user.role === 'employee' ? '👤 Pegawai' : '👔 Owner';
}

// ═══════════════════════════════════════════════════════════════
//  MASTER UMKM DATA  (30 data dummy + data dari DB)
// ═══════════════════════════════════════════════════════════════
const DUMMY_UMKM = [
  { id:'001', nama:'Kopi Senja',         lokasi:'Jakarta Selatan', sektor:'Kuliner',    omzet:'50Jt',  skor:75,  faktor:'Kekuatan: Budaya',      rek:'Efisiensi Biaya' },
  { id:'002', nama:'Batik Nusantara',    lokasi:'Solo',            sektor:'Kerajinan',  omzet:'80Jt',  skor:82,  faktor:'Kekuatan: Kinerja',     rek:'Digitalisasi Pasar' },
  { id:'003', nama:'Toko Makmur',        lokasi:'Bandung',         sektor:'Ritel',      omzet:'40Jt',  skor:45,  faktor:'Kelemahan: Inventori',  rek:'Manajemen Inventori' },
  { id:'004', nama:'Warung Abadi',       lokasi:'Surabaya',        sektor:'Kuliner',    omzet:'65Jt',  skor:91,  faktor:'Kekuatan: Loyalitas',   rek:'Ekspansi Regional' },
  { id:'005', nama:'Seni Ukir Jaya',     lokasi:'Bali',            sektor:'Kerajinan',  omzet:'120Jt', skor:88,  faktor:'Kekuatan: Ekspor',      rek:'Diversifikasi Produk' },
  { id:'006', nama:'Pasar Bersih',       lokasi:'Tangerang',       sektor:'Ritel',      omzet:'25Jt',  skor:32,  faktor:'Kelemahan: Cashflow',   rek:'Restrukturisasi Utang' },
  { id:'007', nama:'Warung Bu Tini',     lokasi:'Yogyakarta',      sektor:'Kuliner',    omzet:'30Jt',  skor:68,  faktor:'Kekuatan: Pelayanan',   rek:'Perluasan Menu' },
  { id:'008', nama:'Tenun Asli',         lokasi:'Lombok',          sektor:'Kerajinan',  omzet:'95Jt',  skor:84,  faktor:'Kekuatan: Produk',      rek:'Ekspor ke Luar Negeri' },
  { id:'009', nama:'Minimarket Sejahtera',lokasi:'Depok',          sektor:'Ritel',      omzet:'200Jt', skor:77,  faktor:'Kekuatan: Lokasi',      rek:'Franchise' },
  { id:'010', nama:'Dapur Ibu',          lokasi:'Semarang',        sektor:'Kuliner',    omzet:'45Jt',  skor:61,  faktor:'Kekuatan: Rasa',        rek:'Catering' },
  { id:'011', nama:'Batik Pekalongan',   lokasi:'Pekalongan',      sektor:'Kerajinan',  omzet:'75Jt',  skor:79,  faktor:'Kekuatan: Tradisi',     rek:'Platform Online' },
  { id:'012', nama:'Toko Herbal Sehat',  lokasi:'Bogor',           sektor:'Kesehatan',  omzet:'55Jt',  skor:86,  faktor:'Kekuatan: Produk',      rek:'Sertifikasi BPOM' },
  { id:'013', nama:'Grosir Murah',       lokasi:'Bekasi',          sektor:'Ritel',      omzet:'300Jt', skor:58,  faktor:'Kelemahan: Margin',     rek:'Manajemen Stok' },
  { id:'014', nama:'Keripik Bu Endah',   lokasi:'Malang',          sektor:'Kuliner',    omzet:'35Jt',  skor:72,  faktor:'Kekuatan: Kemasan',     rek:'Ekspansi Distribusi' },
  { id:'015', nama:'Anyaman Kalimantan', lokasi:'Banjarmasin',     sektor:'Kerajinan',  omzet:'60Jt',  skor:90,  faktor:'Kekuatan: Unik',        rek:'Kerjasama Retail' },
  { id:'016', nama:'Apotek Sehat',       lokasi:'Medan',           sektor:'Kesehatan',  omzet:'180Jt', skor:83,  faktor:'Kekuatan: Kepercayaan', rek:'Layanan Online' },
  { id:'017', nama:'Nasi Padang Asli',   lokasi:'Padang',          sektor:'Kuliner',    omzet:'70Jt',  skor:78,  faktor:'Kekuatan: Autentik',    rek:'Buka Cabang' },
  { id:'018', nama:'Toko Bangunan Maju', lokasi:'Surabaya',        sektor:'Ritel',      omzet:'400Jt', skor:64,  faktor:'Kelemahan: SDM',        rek:'Pelatihan Karyawan' },
  { id:'019', nama:'Keramik Indah',      lokasi:'Yogyakarta',      sektor:'Kerajinan',  omzet:'50Jt',  skor:87,  faktor:'Kekuatan: Desain',      rek:'Galeri Online' },
  { id:'020', nama:'Catering Berkah',    lokasi:'Jakarta Timur',   sektor:'Kuliner',    omzet:'90Jt',  skor:76,  faktor:'Kekuatan: Jaringan',    rek:'Digitalisasi Pesanan' },
  { id:'021', nama:'Klinik Herbal Jaya', lokasi:'Bandung',         sektor:'Kesehatan',  omzet:'65Jt',  skor:81,  faktor:'Kekuatan: Konsultan',   rek:'Aplikasi Telemedicine' },
  { id:'022', nama:'Jajanan Pasar Mbok', lokasi:'Solo',            sektor:'Kuliner',    omzet:'20Jt',  skor:55,  faktor:'Kelemahan: Higienitas', rek:'Sertifikasi Halal' },
  { id:'023', nama:'Toko Elektronik Maju',lokasi:'Makassar',       sektor:'Ritel',      omzet:'250Jt', skor:70,  faktor:'Kelemahan: Garansi',    rek:'After-Sales Service' },
  { id:'024', nama:'Ukiran Jepara',      lokasi:'Jepara',          sektor:'Kerajinan',  omzet:'110Jt', skor:89,  faktor:'Kekuatan: Keahlian',    rek:'Export Premium' },
  { id:'025', nama:'Pecel Lele Bu Sari', lokasi:'Tangerang Selatan',sektor:'Kuliner',   omzet:'28Jt',  skor:63,  faktor:'Kelemahan: Modal',      rek:'KUR BRI' },
  { id:'026', nama:'Toko Buku Cerdas',   lokasi:'Bandung',         sektor:'Ritel',      omzet:'35Jt',  skor:74,  faktor:'Kekuatan: Komunitas',   rek:'Toko Online' },
  { id:'027', nama:'Batik Madura',       lokasi:'Pamekasan',       sektor:'Kerajinan',  omzet:'80Jt',  skor:85,  faktor:'Kekuatan: Heritage',    rek:'Branding Digital' },
  { id:'028', nama:'Warung Sehat Alami', lokasi:'Bogor',           sektor:'Kesehatan',  omzet:'42Jt',  skor:80,  faktor:'Kekuatan: Organik',     rek:'Sertifikasi Organik' },
  { id:'029', nama:'Sembako Murah Pak Budi',lokasi:'Jakarta Utara',sektor:'Ritel',      omzet:'120Jt', skor:48,  faktor:'Kelemahan: Persaingan', rek:'Diferensiasi Produk' },
  { id:'030', nama:'Rendang Bu Fatimah', lokasi:'Bukittinggi',     sektor:'Kuliner',    omzet:'55Jt',  skor:92,  faktor:'Kekuatan: Resep',       rek:'Kemasan Premium' },
];

async function loadUmkmData() {
  // Mulai dari 30 data dummy
  AppState.umkmData = [...DUMMY_UMKM];

  // Lengkapi sisa data dummy secara dinamis dari 031 hingga 428 agar berjumlah 428 sebagai base populasi
  const sectors = ['Kuliner', 'Kerajinan', 'Ritel', 'Kesehatan'];
  const locations = ['Jakarta Selatan', 'Solo', 'Bandung', 'Surabaya', 'Semarang', 'Yogyakarta', 'Medan', 'Makassar', 'Bali', 'Depok', 'Malang', 'Bogor'];
  const factorsStrong = ['Kekuatan: Budaya', 'Kekuatan: Kinerja', 'Kekuatan: Loyalitas', 'Kekuatan: Produk', 'Kekuatan: Lokasi', 'Kekuatan: Rasa', 'Kekuatan: Tradisi', 'Kekuatan: Kepercayaan'];
  const factorsWeak = ['Kelemahan: Inventori', 'Kelemahan: Cashflow', 'Kelemahan: Margin', 'Kelemahan: SDM', 'Kelemahan: Higienitas', 'Kelemahan: Garansi', 'Kelemahan: Modal', 'Kelemahan: Persaingan'];
  const recommendations = ['Efisiensi Biaya', 'Digitalisasi Pasar', 'Manajemen Inventori', 'Ekspansi Regional', 'Diversifikasi Produk', 'Platform Online', 'Sertifikasi BPOM', 'Manajemen Stok'];

  // Seeded random number generator agar data dummy konsisten setiap kali halaman dimuat ulang
  let seed = 12345;
  function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  for (let i = 31; i <= 428; i++) {
    const sector = sectors[Math.floor(random() * sectors.length)];
    const location = locations[Math.floor(random() * locations.length)];
    const skor = Math.floor(random() * 56) + 40; // Skor dari 40 sampai 95
    const isStrong = skor >= 70;
    const factor = isStrong 
      ? factorsStrong[Math.floor(random() * factorsStrong.length)]
      : factorsWeak[Math.floor(random() * factorsWeak.length)];
    const rek = recommendations[Math.floor(random() * recommendations.length)];
    const omzet = (Math.floor(random() * 280) + 20) + 'Jt';

    AppState.umkmData.push({
      id: String(i).padStart(3, '0'),
      nama: `UMKM ${sector} ${location} ${i}`,
      lokasi: location,
      sektor: sector,
      omzet: omzet,
      skor: skor,
      faktor: factor,
      rek: rek
    });
  }

  try {
    const res = await DashboardAPI.getUmkmList({ limit: 1000 });
    if (res && res.ok && res.data && Array.isArray(res.data.rows)) {
      const dbRows = res.data.rows;
      const dbEntries = dbRows.map((r, index) => {
        return {
          id:     String(428 + index + 1).padStart(3, '0'),
          nama:   r.umkm_name || 'UMKM Baru',
          lokasi: r.lokasi    || '-',
          sektor: r.sektor    || '-',
          omzet: (function() {
            const val = r.omzet;
            if (!val) return '-';
            const num = parseInt(val);
            if (isNaN(num) || num === 0) return '-';
            if (num >= 1000000) return (num / 1000000).toFixed(0) + 'Jt';
            if (num >= 1000)    return (num / 1000).toFixed(0) + 'Rb';
            return num + '';
          })(),
          skor:   r.score_on_5 ? Math.round((r.score_on_5 / 5) * 100) : 0,
          faktor: (r.score_on_5 || 0) >= 3 ? 'Kekuatan: Operasional' : 'Kelemahan: Perlu Perhatian',
          rek:    r.health_category === 'SANGAT BAIK' ? 'Pertahankan Kinerja'
                : r.health_category === 'BAIK'        ? 'Optimalisasi Proses'
                : r.health_category === 'CUKUP'       ? 'Peningkatan SDM'
                : 'Intervensi Segera',
          isNew: true,
        };
      });
      AppState.umkmData = [...AppState.umkmData, ...dbEntries];
    }
  } catch(e) {
    console.error('Failed to load UMKM data from database:', e);
  }

  AppState.filteredData = [...AppState.umkmData];
  AppState.currentPage  = 1;
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH  — benar-benar menyaring data
// ═══════════════════════════════════════════════════════════════
function handleSearch(val) {
  const q = val.trim().toLowerCase();
  if (!q) {
    AppState.filteredData = applyFilter(AppState.umkmData, AppState.activeFilter);
    AppState.currentPage  = 1;
    renderUmkmTable();
    return;
  }
  const base = applyFilter(AppState.umkmData, AppState.activeFilter);
  AppState.filteredData = base.filter(u =>
    u.nama.toLowerCase().includes(q)    ||
    u.lokasi.toLowerCase().includes(q)  ||
    u.sektor.toLowerCase().includes(q)  ||
    u.id.toLowerCase().includes(q)      ||
    u.rek.toLowerCase().includes(q)
  );
  AppState.currentPage = 1;
  renderUmkmTable();
  // Navigasi ke tabel UMKM jika belum di sana
  if (!document.getElementById('page-umkmrec')?.classList.contains('active')) {
    navigate('umkmrec');
  }
}

// ═══════════════════════════════════════════════════════════════
//  FILTER  — berdasarkan sektor / kategori
// ═══════════════════════════════════════════════════════════════
function applyFilter(data, filter) {
  if (!filter || filter === 'semua') return data;
  return data.filter(u => u.sektor.toLowerCase().includes(filter.toLowerCase()));
}

function filterByKategori(kategori) {
  AppState.activeFilter = kategori;
  const search = document.getElementById('searchInput')?.value?.trim()?.toLowerCase() || '';
  let base = applyFilter(AppState.umkmData, kategori);
  if (search) {
    base = base.filter(u =>
      u.nama.toLowerCase().includes(search) ||
      u.lokasi.toLowerCase().includes(search) ||
      u.sektor.toLowerCase().includes(search)
    );
  }
  AppState.filteredData = base;
  AppState.currentPage  = 1;
  renderUmkmTable();
  // Navigasi ke tabel
  if (!document.getElementById('page-umkmrec')?.classList.contains('active')) {
    navigate('umkmrec');
  }
  // Close dropdown
  document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('show'));
  showToast(`Filter aktif: ${kategori === 'semua' ? 'Semua UMKM' : kategori}`);
}

function filterUmkmTable(sektor) {
  filterByKategori(sektor);
}

// ═══════════════════════════════════════════════════════════════
//  RENDER UMKM TABLE  — dengan pagination
// ═══════════════════════════════════════════════════════════════
function renderUmkmTable() {
  if (!AppState.umkmData.length) {
    loadUmkmData().then(() => renderUmkmTable());
    return;
  }

  const data      = AppState.filteredData;
  const total     = data.length;
  const pageSize  = AppState.pageSize;
  const page      = AppState.currentPage;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start     = (page - 1) * pageSize;
  const slice     = data.slice(start, start + pageSize);

  const tbody = document.getElementById('umkmTableBody');
  if (!tbody) return;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--gray-400)">Tidak ada data ditemukan</td></tr>`;
  } else {
    tbody.innerHTML = slice.map(u => {
      const scoreClass = u.skor >= 80 ? 'score-great' : u.skor >= 70 ? 'score-good' : u.skor >= 50 ? 'score-mid' : 'score-bad';
      const sektorClass = u.sektor.toLowerCase().includes('kuliner') ? 'sector-kuliner'
                        : u.sektor.toLowerCase().includes('kerajinan') ? 'sector-kerajinan'
                        : u.sektor.toLowerCase().includes('ritel') ? 'sector-ritel'
                        : u.sektor.toLowerCase().includes('kesehatan') ? 'sector-kesehatan'
                        : 'sector-ritel';
      const faktorClass = u.faktor.includes('Kekuatan') ? 'kekuatan' : 'kelemahan';
      return `<tr>
        <td class="umkm-id" onclick="showUmkmDetail('${u.id}')">${u.id}</td>
        <td class="umkm-name">${u.nama}</td>
        <td>${u.lokasi}</td>
        <td><span class="sector-badge ${sektorClass}">${u.sektor.toUpperCase()}</span></td>
        <td>${u.omzet}</td>
        <td><div class="health-score ${scoreClass}">${u.skor}</div></td>
        <td class="${faktorClass}">${u.faktor}</td>
        <td>${u.rek}</td>
      </tr>`;
    }).join('');
  }

  // Update pagination info
  const pInfo = document.getElementById('paginationInfo');
  if (pInfo) pInfo.textContent = `Halaman ${page} dari ${totalPages} (${total} data)`;

  // Render pagination buttons
  renderPaginationBtns(page, totalPages);

  // Update stats
  const avgSkor = data.length ? Math.round(data.reduce((a,b) => a + b.skor, 0) / data.length) : 0;
  safeSet('stat-total-rec', total);
  safeSet('stat-avg-rec', avgSkor + '/100');
}

function renderPaginationBtns(current, total) {
  const wrap = document.getElementById('paginationBtns');
  if (!wrap) return;

  let btns = `<button class="page-btn" onclick="goToPage(${current - 1})" ${current<=1?'disabled':''}>‹</button>`;

  // Build page numbers with ellipsis
  const pages = [];
  if (total <= 7) {
    for (let i=1; i<=total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3)       pages.push('...');
    for (let i=Math.max(2,current-1); i<=Math.min(total-1,current+1); i++) pages.push(i);
    if (current < total-2) pages.push('...');
    pages.push(total);
  }

  pages.forEach(p => {
    if (p === '...') {
      btns += `<button class="page-btn" disabled>...</button>`;
    } else {
      btns += `<button class="page-btn ${p===current?'active':''}" onclick="goToPage(${p})">${p}</button>`;
    }
  });

  btns += `<button class="page-btn" onclick="goToPage(${current + 1})" ${current>=total?'disabled':''}>›</button>`;
  wrap.innerHTML = btns;
}

function goToPage(p) {
  const total = Math.ceil(AppState.filteredData.length / AppState.pageSize);
  if (p < 1 || p > total) return;
  AppState.currentPage = p;
  renderUmkmTable();
  document.getElementById('page-umkmrec')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showUmkmDetail(id) {
  const u = AppState.umkmData.find(x => x.id === id);
  if (!u) return;
  showToast(`Detail: ${u.nama} — Skor ${u.skor} — ${u.rek}`);
}

// ═══════════════════════════════════════════════════════════════
//  EXPORT DATA (CSV)
// ═══════════════════════════════════════════════════════════════
function exportData() {
  const data = AppState.filteredData.length ? AppState.filteredData : AppState.umkmData;
  const headers = ['ID','Nama UMKM','Lokasi','Sektor','Omzet','Skor Kesehatan','Faktor Utama','Rekomendasi'];
  const rows = data.map(u => [u.id, u.nama, u.lokasi, u.sektor, u.omzet, u.skor, u.faktor, u.rek]
    .map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `TerasMatrix_Data_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data berhasil diekspor sebagai CSV', 'success');
}

// ═══════════════════════════════════════════════════════════════
//  LIHAT PROTOKOL POPUP
// ═══════════════════════════════════════════════════════════════
function showProtokol(jenis) {
  const protokols = {
    ins: {
      title: 'Protokol: Sesuaikan Titrasi INS',
      priority: 'PRIORITAS TINGGI',
      color: '#dc2626',
      steps: [
        'Lakukan audit sumber daya kelembagaan dalam 24 jam',
        'Identifikasi gap antara kebutuhan dan ketersediaan NIB',
        'Jadwalkan konsultasi dengan Dinas Koperasi setempat',
        'Susun roadmap pengajuan bantuan pendanaan pemerintah',
        'Monitor progress setiap 2 minggu',
      ],
      eta: '7 hari',
    },
    ect: {
      title: 'Protokol: Penyelarasan Siklus ECT',
      priority: 'PRIORITAS SEDANG',
      color: '#d97706',
      steps: [
        'Analisis konektivitas pasar saat ini vs benchmark industri',
        'Mapping pelanggan potensial di segmen baru',
        'Evaluasi struktur utang dan arus kas triwulan',
        'Buat strategi penetrasi pasar digital',
        'Review bulanan dengan tim manajemen',
      ],
      eta: '48 jam',
    },
    bio: {
      title: 'Protokol: Cek Sinkronisasi Biometrik',
      priority: 'PEMELIHARAAN',
      color: '#059669',
      steps: [
        'Validasi data periferal standar organisasi',
        'Pastikan semua baseline klinis optimal',
        'Dokumentasi kondisi saat ini untuk arsip',
        'Jadwalkan pemindaian rutin berikutnya',
        'Konfirmasi tidak ada anomali baru',
      ],
      eta: 'Tervalidasi',
    },
  };

  const p = protokols[jenis] || protokols.bio;
  const popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:600;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s ease';
  popup.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.2);animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <span style="font-size:10px;font-weight:700;background:${p.color}20;color:${p.color};padding:3px 10px;border-radius:20px">${p.priority}</span>
          <h2 style="font-size:17px;font-weight:800;color:var(--gray-900);margin-top:8px">${p.title}</h2>
        </div>
        <button onclick="this.closest('[style]').remove()" style="width:32px;height:32px;border:none;background:var(--gray-100);border-radius:8px;cursor:pointer;font-size:16px;flex-shrink:0">✕</button>
      </div>
      <div style="margin-bottom:20px">
        ${p.steps.map((s,i) => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--gray-100)">
            <div style="width:24px;height:24px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</div>
            <span style="font-size:13px;color:var(--gray-700)">${s}</span>
          </div>`).join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--gray-50);border-radius:10px;padding:12px 16px">
        <span style="font-size:12px;color:var(--gray-500)">Estimasi waktu penyelesaian</span>
        <span style="font-size:13px;font-weight:700;color:${p.color}">${p.eta}</span>
      </div>
      <button onclick="this.closest('[style]').remove()" style="width:100%;margin-top:16px;padding:12px;background:var(--primary);border:none;border-radius:10px;color:#fff;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit">Tandai Selesai</button>
    </div>
    <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}</style>`;
  document.body.appendChild(popup);
  popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD DATA FROM DB  — update charts & stats
// ═══════════════════════════════════════════════════════════════
async function loadDashboardData() {
  try {
    const res = await DashboardAPI.getStats();
    if (!res || !res.ok) return;
    const { stats, factor_averages: fa } = res.data || {};
    if (!stats) return;

    AppState.dashboardStats = stats;
    AppState.factorAverages = fa;

    // Gunakan nilai TERBESAR antara DB dan local
    const dbTotal    = parseInt(stats.total_umkm) || 0;

    applyDynamicData();
  } catch (e) { /* silent */ }
}

function applyDynamicData() {
  if (!AppState.dashboardStats || !AppState.factorAverages) return;
  const stats = AppState.dashboardStats;
  const fa = AppState.factorAverages;
  const total = Math.max(parseInt(stats.total_umkm) || 0, AppState.totalUmkm);

  updateTotalDisplay(total);
  updateDonutLegend(total);
  
  const sehatCount = parseInt(stats.sehat_count) || 0;
  const totalValid = parseInt(stats.total_valid) || 1;
  const sehatPct   = total > 0 ? Math.round((sehatCount / totalValid) * 100) + '%' : '--';
  safeSet('stat-sehat-pct',   sehatPct);
  safeSet('stat-best-score',  stats.best_score  || '--');
  safeSet('stat-worst-score', stats.worst_score || '--');

  if (window.donutChartInst && total > 0) {
    const buruk = Math.round(total * 0.065);
    const baik  = Math.round(total * 0.194);
    const cukup = total - buruk - baik;
    window.donutChartInst.data.datasets[0].data = [buruk, cukup, baik, 0];
    window.donutChartInst.update('none');
  }

  if (fa && window.barChartInst) {
    const live = [
      (fa.avg_ov_5  !== undefined && fa.avg_ov_5  !== null) ? parseFloat(fa.avg_ov_5)  : 3.41,
      (fa.avg_ops_5 !== undefined && fa.avg_ops_5 !== null) ? parseFloat(fa.avg_ops_5) : 2.38,
      (fa.avg_weq_5 !== undefined && fa.avg_weq_5 !== null) ? parseFloat(fa.avg_weq_5) : 3.31,
      (fa.avg_ins_5 !== undefined && fa.avg_ins_5 !== null) ? parseFloat(fa.avg_ins_5) : 1.79,
      (fa.avg_ldi_5 !== undefined && fa.avg_ldi_5 !== null) ? parseFloat(fa.avg_ldi_5) : 2.95,
      (fa.avg_ect_5 !== undefined && fa.avg_ect_5 !== null) ? parseFloat(fa.avg_ect_5) : 1.80,
    ];
    window.barChartInst.data.datasets[0].data = live;
    window.barChartInst.options.animation = { duration: 600, easing: 'easeOutQuart' };
    window.barChartInst.update();
  }

  if (fa && window.spiderChartInst) {
    window.spiderChartInst.data.datasets[0].data = [
      (fa.avg_ins_5 !== undefined && fa.avg_ins_5 !== null) ? parseFloat(fa.avg_ins_5) : 1.79,
      (fa.avg_ldi_5 !== undefined && fa.avg_ldi_5 !== null) ? parseFloat(fa.avg_ldi_5) : 2.95,
      (fa.avg_weq_5 !== undefined && fa.avg_weq_5 !== null) ? parseFloat(fa.avg_weq_5) : 3.31,
      (fa.avg_ov_5  !== undefined && fa.avg_ov_5  !== null) ? parseFloat(fa.avg_ov_5)  : 3.41,
      (fa.avg_ops_5 !== undefined && fa.avg_ops_5 !== null) ? parseFloat(fa.avg_ops_5) : 2.38,
      (fa.avg_ect_5 !== undefined && fa.avg_ect_5 !== null) ? parseFloat(fa.avg_ect_5) : 1.80,
    ];
    window.spiderChartInst.update();
  }

  // Update UMKM & Recommendations bottom metrics dynamically
  const countBuruk = Math.round(total * 0.065);
  const complianceVal = total > 0 ? (100 - (countBuruk / total * 100)).toFixed(1) : 96.4;
  safeSet('rec-compliance', complianceVal + '%');
  safeSet('rec-critical', countBuruk + ' Peringatan');
  const simulatedRespTime = (14.0 + (total % 10) / 5).toFixed(1);
  safeSet('rec-resp-time', simulatedRespTime + ' Min');
  const nextDate = new Date();
  nextDate.setHours(nextDate.getHours() + 2);
  nextDate.setMinutes(0);
  const nextScan = nextDate.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
  safeSet('rec-next-scan', nextScan);

  // Update Intervensi Strategis metrics
  const protokolAktif = countBuruk > 0 ? countBuruk + 2 : 12;
  safeSet('intv-protokol', protokolAktif);
  
  if (countBuruk > 35) {
    safeSet('intv-skor', 'Kritis');
    safeSet('intv-skor-sub', 'Sangat Tinggi');
    const el = document.getElementById('intv-skor-sub');
    if (el) el.className = 'intervensi-stat-sub warn';
  } else if (countBuruk > 15) {
    safeSet('intv-skor', 'Peringatan');
    safeSet('intv-skor-sub', 'Tinggi');
    const el = document.getElementById('intv-skor-sub');
    if (el) el.className = 'intervensi-stat-sub warn';
  } else {
    safeSet('intv-skor', 'Normal');
    safeSet('intv-skor-sub', 'Stabil');
    const el = document.getElementById('intv-skor-sub');
    if (el) el.className = 'intervensi-stat-sub';
  }

  const efisiensi = (sehatPct && sehatPct !== '--') ? sehatPct : '88%';
  safeSet('intv-efisiensi', efisiensi);

  if (fa) {
    const insVal = (fa.avg_ins_5 !== undefined && fa.avg_ins_5 !== null) ? parseFloat(fa.avg_ins_5) : 1.79;
    const ectVal = (fa.avg_ect_5 !== undefined && fa.avg_ect_5 !== null) ? parseFloat(fa.avg_ect_5) : 1.80;
    
    const insChange = insVal < 3.0 ? '-' + ((3.0 - insVal) * 10).toFixed(1) + '%' : '+' + ((insVal - 3.0) * 10).toFixed(1) + '%';
    safeSet('intv-ins-val', insChange);
    const elIns = document.getElementById('intv-ins-val');
    if (elIns) elIns.className = insVal < 3.0 ? 'analisis-change neg' : 'analisis-change pos';
    
    const ectChange = ectVal < 3.0 ? '-' + ((3.0 - ectVal) * 10).toFixed(1) + '%' : '+' + ((ectVal - 3.0) * 10).toFixed(1) + '%';
    safeSet('intv-ect-val', ectChange);
    const elEct = document.getElementById('intv-ect-val');
    if (elEct) elEct.className = ectVal < 3.0 ? 'analisis-change neg' : 'analisis-change pos';
  }

  // --- INTEGRASI BAGAN-BAGAN FACTOR PROFILE ---
  const factorVals = {
    ins: (fa.avg_ins_5 !== undefined && fa.avg_ins_5 !== null) ? parseFloat(fa.avg_ins_5) : 1.79,
    ldi: (fa.avg_ldi_5 !== undefined && fa.avg_ldi_5 !== null) ? parseFloat(fa.avg_ldi_5) : 2.95,
    weq: (fa.avg_weq_5 !== undefined && fa.avg_weq_5 !== null) ? parseFloat(fa.avg_weq_5) : 3.31,
    ov:  (fa.avg_ov_5  !== undefined && fa.avg_ov_5  !== null) ? parseFloat(fa.avg_ov_5)  : 3.41,
    ops: (fa.avg_ops_5 !== undefined && fa.avg_ops_5 !== null) ? parseFloat(fa.avg_ops_5) : 2.38,
    ect: (fa.avg_ect_5 !== undefined && fa.avg_ect_5 !== null) ? parseFloat(fa.avg_ect_5) : 1.80
  };

  const factorNames = {
    'SUMBER DAYA (INS)': factorVals.ins,
    'KEPEMIMPINAN (LDI)': factorVals.ldi,
    'PROSES (WEQ)': factorVals.weq,
    'BUDAYA (OV)': factorVals.ov,
    'INOVASI (OPS)': factorVals.ops,
    'EKSTERNAL (ECT)': factorVals.ect
  };

  function getFactorBadge(score) {
    if (score < 2.0) {
      if (score < 1.8) return { label: 'CRITICAL', class: 'badge-critical' };
      return { label: 'LOW', class: 'badge-low' };
    }
    if (score < 2.5) return { label: 'AVERAGE', class: 'badge-average' };
    if (score < 3.0) return { label: 'GOOD', class: 'badge-good' };
    if (score < 3.5) return { label: 'OPTIMAL', class: 'badge-optimal' };
    return { label: 'PEAK', class: 'badge-peak' };
  }

  document.querySelectorAll('.factor-card').forEach(card => {
    const nameEl = card.querySelector('.factor-name');
    if (nameEl) {
      const name = nameEl.textContent.trim();
      if (factorNames[name] !== undefined) {
        const val = factorNames[name];
        const scoreEl = card.querySelector('.factor-score');
        if (scoreEl) {
          scoreEl.innerHTML = `${val.toFixed(2)}<span> / 5.0</span>`;
        }
        const badgeEl = card.querySelector('.factor-badge');
        if (badgeEl) {
          const badge = getFactorBadge(val);
          badgeEl.className = 'factor-badge ' + badge.class;
          badgeEl.textContent = badge.label;
        }
      }
    }
  });

  // --- INTEGRASI COMPARISON PAGE ---
  const comparisonFactors = {
    'Sumber Daya / INS (Institutional Resources)': { val: factorVals.ins, target: 3.30 },
    'Kepemimpinan / LDI (Leadership)': { val: factorVals.ldi, target: 3.50 },
    'Proses / WEQ (Work Environment Quality)': { val: factorVals.weq, target: 3.50 },
    'Budaya / OV (Organizational Values)': { val: factorVals.ov, target: 3.60 },
    'Inovasi / OPS (Operational Stability)': { val: factorVals.ops, target: 3.20 },
    'Eksternal / ECT (Economic Connectivity)': { val: factorVals.ect, target: 3.00 }
  };

  document.querySelectorAll('.factor-row').forEach(row => {
    const nameEl = row.querySelector('.factor-row-name');
    if (nameEl) {
      const name = nameEl.textContent.trim();
      const targetCfg = comparisonFactors[name];
      if (targetCfg) {
        const { val, target } = targetCfg;
        const scoreEl = row.querySelector('.factor-row-score');
        if (scoreEl) {
          scoreEl.textContent = val.toFixed(2);
          if (val < 2.0) {
            scoreEl.classList.add('red');
          } else {
            scoreEl.classList.remove('red');
          }
        }
        const fillEl = row.querySelector('.bar-fill');
        if (fillEl) {
          const pct = Math.min(Math.round((val / target) * 100), 100);
          fillEl.style.width = `${pct}%`;
          fillEl.className = 'bar-fill';
          if (val < 2.0) {
            fillEl.classList.add('red');
          } else if (val < 3.0) {
            fillEl.classList.add('blue');
          } else {
            fillEl.classList.add('teal');
          }
        }
      }
    }
  });

  // --- INTEGRASI PERBANDINGAN PERFORMER & GAP CARDS ---
  if (AppState.umkmData && AppState.umkmData.length > 0) {
    let bestUmkm = AppState.umkmData[0];
    let worstUmkm = AppState.umkmData[0];
    for (let i = 1; i < AppState.umkmData.length; i++) {
      const u = AppState.umkmData[i];
      if (u.skor > bestUmkm.skor) {
        bestUmkm = u;
      }
      if (u.skor < worstUmkm.skor) {
        worstUmkm = u;
      }
    }

    const bestScoreOn5 = ((bestUmkm.skor / 100) * 5).toFixed(2);
    const worstScoreOn5 = ((worstUmkm.skor / 100) * 5).toFixed(2);

    // Update Top Performer Card
    safeSet('comp-top-id', 'UMKM ID ' + bestUmkm.id + ' (' + bestUmkm.nama + ')');
    const topScoreEl = document.getElementById('comp-top-score');
    if (topScoreEl) {
      topScoreEl.innerHTML = `${bestScoreOn5}<span> / 5.00</span>`;
    }
    const topStatusEl = document.getElementById('comp-top-status');
    if (topStatusEl) {
      const isExcellent = parseFloat(bestScoreOn5) >= 3.5;
      topStatusEl.textContent = isExcellent ? '✓ Status: Excellent' : '✓ Status: Good';
      topStatusEl.className = 'performer-status status-excellent';
    }

    // Update Critical Action Card
    safeSet('comp-crit-id', 'UMKM ID ' + worstUmkm.id + ' (' + worstUmkm.nama + ')');
    const critScoreEl = document.getElementById('comp-crit-score');
    if (critScoreEl) {
      critScoreEl.innerHTML = `${worstScoreOn5}<span> / 5.00</span>`;
    }
    const critStatusEl = document.getElementById('comp-crit-status');
    if (critStatusEl) {
      const isIntervention = parseFloat(worstScoreOn5) < 2.0;
      critStatusEl.textContent = isIntervention ? '! Status: Intervention Required' : '! Status: Needs Monitoring';
      critStatusEl.className = isIntervention ? 'performer-status status-intervention' : 'performer-status status-excellent';
    }

    // Update Gap Analysis Card
    const avgScorePct = (stats && stats.avg_score_pct) ? parseFloat(stats.avg_score_pct) : 76.0;
    const avgScoreOn5 = ((avgScorePct / 100) * 5).toFixed(2);
    safeSet('comp-gap-avg', avgScoreOn5);

    const barPct = Math.round((parseFloat(avgScoreOn5) / 5) * 100);
    const barEl = document.getElementById('comp-gap-bar');
    if (barEl) {
      barEl.style.width = barPct + '%';
    }

    const bestVal = parseFloat(bestScoreOn5);
    const worstVal = parseFloat(worstScoreOn5);
    const disparity = bestVal > 0 ? (((bestVal - worstVal) / bestVal) * 100).toFixed(1) : '0.0';
    safeSet('comp-gap-text', `Penyimpangan skor antara ID ${bestUmkm.id} dan ID ${worstUmkm.id} menunjukkan disparitas standar klinis sebesar ${disparity}%.`);
  }

  // --- INTEGRASI EXECUTIVE SUMMARY ---
  const sortedFactors = [
    { key: 'Sumber Daya (INS)', val: factorVals.ins },
    { key: 'Kepemimpinan (LDI)', val: factorVals.ldi },
    { key: 'Proses (WEQ)', val: factorVals.weq },
    { key: 'Budaya (OV)', val: factorVals.ov },
    { key: 'Inovasi (OPS)', val: factorVals.ops },
    { key: 'Eksternal (ECT)', val: factorVals.ect }
  ].sort((a, b) => b.val - a.val);

  const strong1 = sortedFactors[0].key;
  const strong2 = sortedFactors[1].key;
  const weak1 = sortedFactors[5].key;
  const weak2 = sortedFactors[4].key;

  const execTextEl = document.querySelector('.exec-text');
  if (execTextEl) {
    execTextEl.innerHTML = `Hasil analisis terkini menunjukkan <strong>${strong1}</strong> dan <strong>${strong2}</strong> sebagai kekuatan utama yang mendukung kondisi internal yang sehat dan solid. Di sisi lain, <strong>${weak1}</strong> dan <strong>${weak2}</strong> masih perlu mendapat perhatian segera.`;
  }

  if (window.histChartInst && total > 0) {
    const newData = updateDistributionUI();
    const sorted = [...newData].sort((a, b) => b - a);
    const top1 = sorted[0], top2 = sorted[1];
    window.histChartInst.data.datasets[0].data = newData;
    window.histChartInst.data.datasets[0].backgroundColor = newData.map(v => v===top1?'#1a56db': v===top2?'#3b82f6':'#93c5fd');
    window.histChartInst.update('none');
  } else {
    updateDistributionUI();
  }
}

// Update semua elemen yang menampilkan total UMKM
function updateTotalDisplay(total) {
  safeSet('donut-total', total);
  safeSet('stat-total-umkm', total);
  safeSet('rec-total-count', total);
}

// Update teks legend di bawah donut chart
function updateDonutLegend(total) {
  const buruk = Math.round(total * 0.065);
  const baik  = Math.round(total * 0.194);
  const cukup = total - buruk - baik;
  const legends = document.querySelectorAll('.legend-item');
  if (legends.length >= 4) {
    // Buruk, Cukup, Baik, Sangat Baik
    const texts = [`Buruk (${buruk})`, `Cukup (${cukup})`, `Baik (${baik})`, 'Sangat Baik (0)'];
    legends.forEach((el, i) => {
      const dot = el.querySelector('.legend-dot');
      const text = texts[i] || el.textContent;
      if (dot) el.innerHTML = '';
      if (dot) el.appendChild(dot);
      el.appendChild(document.createTextNode(text));
    });
  }
}

// Function to update the distribution data dynamically based on AppState
function updateDistributionUI() {
  const data = AppState.filteredData || AppState.umkmData || [];
  const total = data.length;
  if (total === 0) return [0,0,0,0,0,0,0];

  const distPop = document.getElementById('dist-populasi');
  if (distPop) distPop.textContent = 'Populasi: ' + total;

  let bins = [0, 0, 0, 0, 0, 0, 0];
  let scores5 = [];
  data.forEach(u => {
     let s5 = u.skor / 20; 
     if (s5 === 0) s5 = 1.0; 
     scores5.push(s5);
     if (s5 < 1.25) bins[0]++;
     else if (s5 < 1.75) bins[1]++;
     else if (s5 < 2.25) bins[2]++;
     else if (s5 < 2.75) bins[3]++;
     else if (s5 < 3.25) bins[4]++;
     else if (s5 < 3.75) bins[5]++;
     else bins[6]++;
  });

  scores5.sort((a,b) => a-b);
  const q1 = scores5[Math.floor(total * 0.25)] || 0;
  const q2 = scores5[Math.floor(total * 0.5)] || 0;
  const q3 = scores5[Math.floor(total * 0.75)] || 0;
  const iqr = q3 - q1;

  safeSet('bw-median-score', q2.toFixed(2));
  safeSet('bw-q1', q1.toFixed(2));
  safeSet('bw-q2', q2.toFixed(2));
  safeSet('bw-q3', q3.toFixed(2));
  safeSet('bw-iqr', iqr.toFixed(2));

  let sum = 0;
  scores5.forEach(s => sum += s);
  const mean = sum / total;
  let sumSq = 0;
  scores5.forEach(s => sumSq += (s - mean)*(s - mean));
  const sd = Math.sqrt(sumSq / total);

  let outliers = [];
  data.forEach(u => {
     let s5 = u.skor / 20;
     if (s5 === 0) s5 = 1.0;
     let z = sd === 0 ? 0 : Math.abs(s5 - mean) / sd;
     if (z > 2.5) outliers.push({ id: u.id, z: z });
  });

  outliers.sort((a,b) => b.z - a.z);

  const titleEl = document.getElementById('outlier-count-title');
  if (titleEl) titleEl.textContent = 'Data Outlier (' + outliers.length + ')';

  const tbody = document.getElementById('outlier-tbody');
  if (tbody) {
     tbody.innerHTML = '';
     if (outliers.length === 0) {
         tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#9ca3af;padding:10px;">Tidak ada outlier (Z > 2.5)</td></tr>';
     } else {
         outliers.forEach(o => {
             const tr = document.createElement('tr');
             tr.innerHTML = `<td>#SH-${o.id}</td><td class="z-score" style="color:var(--danger);font-weight:700">${o.z.toFixed(2)}</td>`;
             tbody.appendChild(tr);
         });
     }
  }
  return bins;
}

// Called after form submit succeeds — update charts in-place
function refreshAllCharts() {
  const total = AppState.totalUmkm;

  // Update semua angka total
  updateTotalDisplay(total);
  updateDonutLegend(total);

  // Donut chart — update data proporsional, JANGAN reset ke 0
  if (window.donutChartInst) {
    const buruk = Math.round(total * 0.065);
    const baik  = Math.round(total * 0.194);
    const cukup = total - buruk - baik;
    window.donutChartInst.data.datasets[0].data = [buruk, cukup, baik, 0];
    window.donutChartInst.options.animation = { duration: 600, easing: 'easeOutQuart' };
    window.donutChartInst.update();
  }

  // Histogram distribution — scale proporsional
  if (window.histChartInst) {
    const newData = updateDistributionUI();
    const sorted = [...newData].sort((a, b) => b - a);
    const top1 = sorted[0], top2 = sorted[1];
    window.histChartInst.data.datasets[0].data = newData;
    window.histChartInst.data.datasets[0].backgroundColor = newData.map(v => v===top1?'#1a56db': v===top2?'#3b82f6':'#93c5fd');
    window.histChartInst.options.animation = { duration: 600 };
    window.histChartInst.update();
  }

  // Bar & spider chart: update via DB (jika ada), fallback ke nilai saat ini
  loadDashboardData();
}

function safeSet(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ═══════════════════════════════════════════════════════════════
//  PROFILE PAGE
// ═══════════════════════════════════════════════════════════════
function renderProfilePage() {
  const user = AppState.currentUser;
  if (!user) return;
  const container = document.getElementById('profile-content');
  if (!container) return;

  const displayName = user.displayName || user.umkm_name || user.email?.split('@')[0] || 'Pengguna';
  const roleLabel   = user.role === 'employee' ? 'Pegawai' : 'Owner';
  const roleColor   = user.role === 'employee' ? '#7c3aed' : '#1a56db';
  const roleBg      = user.role === 'employee' ? '#ede9fe' : '#dbeafe';
  const initial     = displayName[0].toUpperCase();

  container.innerHTML = `
    <!-- Hero card -->
    <div style="background:linear-gradient(135deg,#1e3a8a,#1a56db);border-radius:20px;padding:32px;color:#fff;display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-bottom:20px">
      <div style="width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,0.2);border:3px solid rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;flex-shrink:0">${initial}</div>
      <div>
        <div style="font-size:24px;font-weight:800;margin-bottom:4px">${displayName}</div>
        <div style="font-size:14px;opacity:0.8;margin-bottom:10px">${user.email || ''}</div>
        <span style="background:rgba(255,255,255,0.2);border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700">${roleLabel}</span>
      </div>
    </div>

    <!-- Info card -->
    <div class="card" style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:var(--gray-400);margin-bottom:16px;letter-spacing:1px">INFORMASI AKUN</div>
      ${infoRow('👤','Nama UMKM', displayName)}
      ${infoRow('📧','Email', user.email || '-')}
      ${infoRow('🎭','Peran', roleLabel, roleColor, roleBg)}
      ${infoRow('📍','Lokasi', user.lokasi || '-')}
      ${infoRow('🏭','Sektor', user.sektor || '-')}
      ${infoRow('💰','Omzet/Bulan', user.omzet ? 'IDR ' + Number(user.omzet).toLocaleString('id-ID') : '-')}
    </div>

    <!-- Quick actions -->
    <div class="card">
      <div style="font-size:11px;font-weight:700;color:var(--gray-400);margin-bottom:16px;letter-spacing:1px">AKSI CEPAT</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        ${quickAction('📋','Isi Kuesioner','Tambah data kesehatan UMKM baru',"navigate('formdata')",'var(--primary-light)','var(--primary)')}
        ${quickAction('📊','Lihat Dashboard','Pantau perkembangan skor',"navigate('home')",'#d1fae5','var(--success)')}
        ${quickAction('🚪','Logout','Keluar dari sistem',"showModal('logoutModal')",'#fee2e2','var(--danger)')}
      </div>
    </div>
  `;
}

function infoRow(icon, label, value, valColor='var(--gray-800)', valBg='') {
  const valStyle = valColor !== 'var(--gray-800)' 
    ? `background:${valBg};color:${valColor};padding:2px 10px;border-radius:20px;font-weight:700;font-size:12px`
    : 'color:var(--gray-800);font-weight:600;font-size:13px';
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-100)">
      <span style="font-size:13px;color:var(--gray-500);display:flex;align-items:center;gap:8px">${icon} ${label}</span>
      <span style="${valStyle}">${value}</span>
    </div>`;
}

function quickAction(icon, title, desc, onclick, bg, color) {
  return `
    <div onclick="${onclick}" style="background:${bg};border-radius:12px;padding:16px;cursor:pointer;transition:all 0.15s;border:1.5px solid transparent"
         onmouseover="this.style.borderColor='${color}';this.style.transform='translateY(-2px)'"
         onmouseout="this.style.borderColor='transparent';this.style.transform=''">
      <div style="font-size:28px;margin-bottom:8px">${icon}</div>
      <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:4px">${title}</div>
      <div style="font-size:11px;color:var(--gray-500)">${desc}</div>
    </div>`;
}


// ═══════════════════════════════════════════════════════════════
//  DROPDOWN
// ═══════════════════════════════════════════════════════════════
function toggleDropdown(id) {
  document.querySelectorAll('.dropdown-menu').forEach(d => { if (d.id !== id) d.classList.remove('show'); });
  document.getElementById(id)?.classList.toggle('show');
}
document.addEventListener('click', e => {
  if (!e.target.closest('[onclick*="toggleDropdown"]') && !e.target.closest('.dropdown-menu'))
    document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('show'));
});

// ═══════════════════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════════════════
function showModal(id) { document.getElementById(id)?.classList.add('show'); }
function hideModal(id) { document.getElementById(id)?.classList.remove('show'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) e.target.classList.remove('show');
});

// ═══════════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════════
let _toastTimer;
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastMsg').textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className=''; }, 3500);
}

// ═══════════════════════════════════════════════════════════════
//  CHART HELPERS
// ═══════════════════════════════════════════════════════════════
function destroyChart(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const c = Chart.getChart(el);
  if (c) c.destroy();
}

// ═══════════════════════════════════════════════════════════════
//  HOME CHARTS
// ═══════════════════════════════════════════════════════════════
function initHomeCharts() {
  AppState.chartsInit.home = true;

  const total = AppState.totalUmkm;  // dari localStorage, persist across reload
  const buruk = Math.round(total * 0.065);
  const baik  = Math.round(total * 0.194);
  const cukup = total - buruk - baik;

  destroyChart('donutChart');
  window.donutChartInst = new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: ['Buruk','Cukup','Baik','Sangat Baik'],
      datasets: [{ data:[buruk, cukup, baik, 0], backgroundColor:['#ef4444','#1a56db','#22c55e','#d1d5db'], borderWidth:3, borderColor:'#fff', hoverOffset:10 }]
    },
    options: { cutout:'72%', plugins:{ legend:{display:false} }, animation:{ animateScale:true, animateRotate:true, duration:1000, easing:'easeOutBounce' } }
  });

  // Update semua angka yang menampilkan total
  updateTotalDisplay(total);

  // Update legend di bawah donut
  updateDonutLegend(total);

  destroyChart('barChart');
  window.barChartInst = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: ['Budaya','Inovasi','Proses','Sumber\nDaya','Kepemimpinan','Eksternal'],
      datasets: [{ data:[3.41,2.38,3.31,1.79,2.95,1.80], backgroundColor:['#0f9b6e','#d97706','#1a56db','#ef4444','#1a56db','#0891b2'], borderRadius:8, borderSkipped:false }]
    },
    options: {
      plugins:{ legend:{display:false} },
      scales:{ y:{ beginAtZero:true, max:5, grid:{color:'#f3f4f6'}, ticks:{stepSize:1} }, x:{ grid:{display:false} } },
      animation:{ duration:1200, easing:'easeOutElastic', delay:(ctx)=>ctx.dataIndex*80 }
    }
  });

  destroyChart('trendMini');
  new Chart(document.getElementById('trendMini'), {
    type:'line',
    data:{ labels:['Q1','Q2','Q3','Q4','Q5'], datasets:[{ data:[1.2,1.8,2.0,2.5,3.1], borderColor:'rgba(255,255,255,0.9)', borderWidth:2, pointRadius:3, pointBackgroundColor:'#fff', fill:true, backgroundColor:'rgba(255,255,255,0.1)', tension:0.4 }] },
    options:{ plugins:{legend:{display:false}}, scales:{y:{display:false},x:{display:false}}, animation:{duration:1000} }
  });
}

function switchChart(mode) {
  document.getElementById('btnBulanan')?.classList.toggle('active', mode==='bulanan');
  document.getElementById('btnQuater')?.classList.toggle('active', mode==='quater');
  if (!window.barChartInst) return;
  window.barChartInst.data.datasets[0].data = mode==='bulanan'
    ? [2.80,2.10,3.10,1.50,2.60,1.60] : [3.41,2.38,3.31,1.79,2.95,1.80];
  window.barChartInst.options.animation = {duration:700,easing:'easeOutQuart'};
  window.barChartInst.update();
  showToast(`Tampilan: ${mode==='bulanan'?'Bulanan':'Per Kuarter'}`);
}

function initSpiderChart() {
  AppState.chartsInit.factor = true;
  destroyChart('spiderChart');
  
  const fa = AppState.factorAverages;
  const ins = fa ? (parseFloat(fa.avg_ins_5) || 1.79) : 1.79;
  const ldi = fa ? (parseFloat(fa.avg_ldi_5) || 2.95) : 2.95;
  const weq = fa ? (parseFloat(fa.avg_weq_5) || 3.31) : 3.31;
  const ov  = fa ? (parseFloat(fa.avg_ov_5)  || 3.41) : 3.41;
  const ops = fa ? (parseFloat(fa.avg_ops_5) || 2.38) : 2.38;
  const ect = fa ? (parseFloat(fa.avg_ect_5) || 1.80) : 1.80;

  window.spiderChartInst = new Chart(document.getElementById('spiderChart'), {
    type:'radar',
    data:{labels:['Sumber Daya','Kepemimpinan','Proses','Budaya','Inovasi','Eksternal'],
          datasets:[
            {label:'Skor Aktual',data:[ins,ldi,weq,ov,ops,ect],backgroundColor:'rgba(26,86,219,0.18)',borderColor:'#1a56db',pointBackgroundColor:'#1a56db',borderWidth:2.5,pointRadius:5},
            {label:'Benchmark',data:[2.5,2.5,2.5,2.5,2.5,2.5],backgroundColor:'transparent',borderColor:'#d1d5db',borderDash:[5,5],borderWidth:1.5,pointRadius:3}
          ]},
    options:{scales:{r:{beginAtZero:true,max:5,ticks:{stepSize:1,backdropColor:'transparent'},pointLabels:{font:{size:11,weight:'700'}},grid:{color:'#e5e7eb'}}},plugins:{legend:{display:false}},animation:{duration:1200}}
  });
}

function initDistCharts() {
  AppState.chartsInit.distribution = true;
  destroyChart('histChart');

  const raw = updateDistributionUI() || [0,0,0,0,0,0,0];

  const sorted = [...raw].sort((a, b) => b - a);
  const top1 = sorted[0], top2 = sorted[1];

  const peakPlugin = {
    id: 'peaks',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const dataArr = chart.getDatasetMeta(0).data;
      const vals = chart.data.datasets[0].data;
      const s = [...vals].sort((a,b)=>b-a);
      const t1 = s[0], t2 = s[1];
      dataArr.forEach((bar, i) => {
        if (vals[i] === t1 || vals[i] === t2) {
          ctx.save();
          ctx.fillStyle = '#1e3a8a';
          ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Peak', bar.x, bar.y - 8);
          ctx.restore();
        }
      });
    }
  };

  window.histChartInst = new Chart(document.getElementById('histChart'), {
    type: 'bar',
    data: {
      labels: ['1.0','1.5','2.0','2.5','3.0','3.5','4.0'],
      datasets: [{
        data: raw,
        backgroundColor: raw.map(v => v===top1?'#1a56db': v===top2?'#3b82f6':'#93c5fd'),
        borderRadius: 6, borderSkipped: false
      }]
    },
    plugins: [peakPlugin],
    options: {
      plugins: { legend:{display:false} },
      scales: { y:{ beginAtZero:true, grid:{color:'#f3f4f6'} }, x:{ grid:{display:false}, title:{display:true,text:'Skor (1.0 – 4.0)'} } },
      animation: { duration:1000, easing:'easeOutBounce', delay:(ctx)=>ctx.dataIndex*60 }
    }
  });
}

function initCompCharts() {
  AppState.chartsInit.comparison = true;
  destroyChart('trendChart');
  new Chart(document.getElementById('trendChart'),{type:'bar',data:{labels:['Mei','Agt','Nov','Des'],datasets:[{data:[1.5,1.8,3.2,2.8],backgroundColor:['#d1d5db','#d1d5db','#1a56db','#93c5fd'],borderRadius:6,borderSkipped:false}]},options:{plugins:{legend:{display:false}},scales:{y:{display:false},x:{grid:{display:false}}},animation:{duration:900,easing:'easeOutElastic',delay:(c)=>c.dataIndex*100}}});
}

function filterPipa(btn, type) {
  document.querySelectorAll('.pipa-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.pipa-card').forEach(c=>{c.style.display=(type==='all'||c.dataset.priority==='high')?'block':'none';});
}

// ═══════════════════════════════════════════════════════════════
//  INIT DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function initDashboard() {
  AppState.chartsInit = {};
  await loadUmkmData();
  updateUserDisplay();
  navigate('home');
}
