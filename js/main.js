// ═══════════════════════════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════════════════════════
const RESPONDENT_LIMIT = 30;

const AppState = {
  sidebarOpen:  true,
  currentUser:  null,
  chartsInit:   {},
  umkmData:     [],
  filteredData: [],
  currentPage:  1,
  pageSize:     10,
  maxPages:     Math.ceil(RESPONDENT_LIMIT / 10),
  maxTableRows: RESPONDENT_LIMIT,
  activeFilter: 'semua',

  // Total UMKM — single source of truth
  get totalUmkm() {
    return Math.min(RESPONDENT_LIMIT, (this.umkmData || []).length);
  },
  addUmkm() {
    return Math.min(RESPONDENT_LIMIT, this.totalUmkm + 1);
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
  const pageElement = document.getElementById('page-' + page);
  if (!pageElement) return;
  sessionStorage.setItem('nexa_page', page);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  pageElement.classList.add('active');
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
  
  const user = AppState.currentUser || { displayName: 'Pengguna' };
  safeSet('notif-halo', 'Halo, ' + user.displayName + '!');
  if (!data.length) {
    const listContainer = document.getElementById('notif-list-container');
    if (listContainer) listContainer.innerHTML = '<div class="notif-empty">Belum ada data kuesioner atau notifikasi.</div>';
    safeSet('notif-badge-count-text', '0');
    safeSet('notif-badge-num', '00');
    return;
  }
  
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
            <div class="notif-item-title">Peringatan Distribusi: Pencilan Terdeteksi</div>
            <div class="notif-item-desc">Ditemukan ${outlierIDs.length} UMKM dengan performa ekstrem${outlierText} yang berada jauh di atas rata-rata populasi. Segera tinjau anomali data.</div>
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
  
  document.querySelectorAll('.user-name').forEach(el => {
    el.textContent = displayName;
  });


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
  if (rb) rb.textContent = user.role === 'employee' ? '👤 Pegawai' : '👔 Pemilik UMKM';
}

// ═══════════════════════════════════════════════════════════════
//  MASTER UMKM DATA (Data dari database)
// ═══════════════════════════════════════════════════════════════

let isFetchingUmkm = false;

async function loadUmkmData() {
  if (AppState.umkmData && AppState.umkmData.length > 0) return;
  if (isFetchingUmkm) {
    while (isFetchingUmkm) await new Promise(r => setTimeout(r, 50));
    return;
  }
  
  isFetchingUmkm = true;
  AppState.umkmData = [];
  try {
    const res = await DashboardAPI.getUmkmList({ 
      limit: RESPONDENT_LIMIT 
    });
    if (res && res.ok && res.data && Array.isArray(res.data.rows)) {
      const dbRows = res.data.rows;
      const baseId = AppState.umkmData.length;
      const dbEntries = dbRows.map((r, index) => {
        return {
          id:     String(baseId + index + 1).padStart(3, '0'),
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
          skor: r.score_on_5 != null ? Number(r.score_on_5) * 20 : 0,
          faktor: (r.score_on_5 || 0) >= 3 ? 'Kekuatan: Operasional' : 'Kelemahan: Perlu Perhatian',
          rek:    r.health_category === 'SANGAT BAIK' ? 'Pertahankan Kinerja'
                : r.health_category === 'BAIK'        ? 'Optimalisasi Proses'
                : r.health_category === 'CUKUP'       ? 'Peningkatan SDM'
                : 'Intervensi Segera',
          tanggal: r.submitted_at || null,
          isNew: true,
          scores: {
             ov:  parseFloat(r.score_ov_5) || 0,
             ldi: parseFloat(r.score_ldi_5) || 0,
             ins: parseFloat(r.score_ins_5) || 0,
             ops: parseFloat(r.score_ops_5) || 0,
             weq: parseFloat(r.score_weq_5) || 0,
             ect: parseFloat(r.score_ect_5) || 0
          }
        };
      });
      AppState.umkmData = [...dbEntries, ...AppState.umkmData].slice(0, RESPONDENT_LIMIT);
    }
  } catch(e) {
    console.error('Failed to load UMKM data from database:', e);
  } finally {
    isFetchingUmkm = false;
  }

  AppState.umkmData.forEach((umkm, index) => {
    umkm.id = String(index + 1).padStart(3, '0');
  });
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
  const f = filter.toLowerCase();
  
  if (f === 'agribisnis') {
    return data.filter(u => {
      const sek = u.sektor.toLowerCase();
      return sek.includes('pertanian') || sek.includes('perkebunan') || sek.includes('agribisnis');
    });
  }
  
  return data.filter(u => u.sektor.toLowerCase().includes(f));
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
  showToast(`Penyaring aktif: ${kategori === 'semua' ? 'Semua UMKM' : kategori}`);
}

function filterUmkmTable(sektor) {
  filterByKategori(sektor);
}

// ═══════════════════════════════════════════════════════════════
//  RENDER UMKM TABLE  — dengan pagination
// ═══════════════════════════════════════════════════════════════
function renderUmkmTable() {
  const data      = AppState.filteredData;
  const total     = data.length;
  const maxPages  = AppState.maxPages || 3;
  const pageSize  = AppState.pageSize || 10;
  const visibleData = data.slice(0, AppState.maxTableRows || 30);
  const totalPages = Math.min(maxPages, Math.max(1, Math.ceil(visibleData.length / pageSize)));
  const page      = Math.min(AppState.currentPage, totalPages);
  AppState.currentPage = page;
  const start     = (page - 1) * pageSize;
  const slice     = visibleData.slice(start, start + pageSize);

  const tbody = document.getElementById('umkmTableBody');
  if (!tbody) return;

  if (!AppState.umkmData.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--gray-500)">Belum ada data kuesioner.</td></tr>';
    safeSet('paginationInfo', 'Belum ada data');
    safeSet('paginationBtns', '');
    document.querySelector('#page-umkmrec .pagination')?.setAttribute('hidden', '');
    document.getElementById('table-stats')?.setAttribute('hidden', '');
    document.getElementById('recommendation-content')?.setAttribute('hidden', '');
    document.getElementById('recommendation-empty-state')?.removeAttribute('hidden');
    safeSet('rec-total-count', '0');
    safeSet('stat-total-rec', '0');
    safeSet('stat-avg-rec', '—');
    return;
  }

  document.querySelector('#page-umkmrec .pagination')?.removeAttribute('hidden');
  document.getElementById('table-stats')?.removeAttribute('hidden');
  document.getElementById('recommendation-content')?.removeAttribute('hidden');
  document.getElementById('recommendation-empty-state')?.setAttribute('hidden', '');
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
  if (pInfo) pInfo.textContent = `Halaman ${page} dari ${totalPages} (${visibleData.length} dari ${total} data ditampilkan)`;
  const tableCount = document.querySelector('#page-umkmrec .table-count');
  if (tableCount) {
    const rangeStart = visibleData.length ? start + 1 : 0;
    const rangeEnd = Math.min(start + slice.length, visibleData.length);
    tableCount.textContent = `Menampilkan ${rangeStart}-${rangeEnd} dari ${total} responden`;
  }

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

  const pages = [];
  for (let i = 1; i <= total; i++) pages.push(i);

  pages.forEach(p => {
    btns += `<button class="page-btn ${p===current?'active':''}" onclick="goToPage(${p})">${p}</button>`;
  });

  btns += `<button class="page-btn" onclick="goToPage(${current + 1})" ${current>=total?'disabled':''}>›</button>`;
  wrap.innerHTML = btns;
}

function goToPage(p) {
  const maxPages = AppState.maxPages || 3;
  const visibleCount = Math.min(AppState.filteredData.length, AppState.maxTableRows || 30);
  const total = Math.max(1, Math.min(maxPages, Math.ceil(visibleCount / Math.max(1, AppState.pageSize))));
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
  if (!data.length) {
    showToast('Belum ada data untuk diekspor.', 'warning');
    return;
  }
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
        'Tinjauan bulanan bersama tim pengelola',
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
  if (!AppState.umkmData || AppState.umkmData.length === 0) {
    await loadUmkmData();
  }
  
  const data = AppState.umkmData;
  const total = data.length;
  if (total === 0) {
    AppState.dashboardStats = null;
    AppState.factorAverages = null;
    applyEmptyDashboardState();
    return;
  }

  let sumOV = 0, sumLDI = 0, sumINS = 0, sumOPS = 0, sumWEQ = 0, sumECT = 0;
  let sehatCount = 0;
  let maxScore = 0;
  let minScore = 100;
  
  data.forEach(u => {
    if (u.scores) {
       sumOV += u.scores.ov;
       sumLDI += u.scores.ldi;
       sumINS += u.scores.ins;
       sumOPS += u.scores.ops;
       sumWEQ += u.scores.weq;
       sumECT += u.scores.ect;
    }
    if (u.skor >= 60) sehatCount++; // "Sehat" cutoff
    if (u.skor > maxScore) maxScore = u.skor;
    if (u.skor < minScore) minScore = u.skor;
  });
  
  AppState.dashboardStats = {
    total_umkm: total,
    total_valid: total,
    sehat_count: sehatCount,
    best_score: maxScore,
    worst_score: minScore,
    avg_score_pct: data.reduce((sum, item) => sum + item.skor, 0) / total
  };
  
  AppState.factorAverages = {
    avg_ov_5: (sumOV / total).toFixed(2),
    avg_ldi_5: (sumLDI / total).toFixed(2),
    avg_ins_5: (sumINS / total).toFixed(2),
    avg_ops_5: (sumOPS / total).toFixed(2),
    avg_weq_5: (sumWEQ / total).toFixed(2),
    avg_ect_5: (sumECT / total).toFixed(2)
  };

  applyDynamicData();
}

function setDashboardContentVisibility(hasData) {
  const contentStates = [
    ['factor-grid', hasData],
    ['factor-summary', hasData],
    ['factor-empty-state', !hasData],
    ['distribution-content', hasData],
    ['distribution-empty-state', !hasData],
    ['comparison-content', hasData],
    ['comparison-extra', hasData],
    ['table-stats', hasData],
    ['recommendation-content', hasData],
    ['recommendation-empty-state', !hasData],
  ];
  contentStates.forEach(([id, visible]) => {
    const element = document.getElementById(id);
    if (element) element.toggleAttribute('hidden', !visible);
  });
  if (hasData) {
    [window.spiderChartInst, window.histChartInst, window.trendChartInst].forEach(chart => chart?.resize());
  }
}

function getHealthCategoryCounts(data) {
  const counts = [0, 0, 0, 0];

  data.forEach(({ skor }) => {
    if (skor < 40) counts[0]++;
    else if (skor < 60) counts[1]++;
    else if (skor < 80) counts[2]++;
    else counts[3]++;
  });

  return counts;
}

function applyEmptyDashboardState() {
  setDashboardContentVisibility(false);
  updateTotalDisplay(0);
  updateDonutLegend(0);
  safeSet('stat-sehat-pct', '—');
  safeSet('stat-best-score', '—');
  safeSet('stat-worst-score', '—');
  safeSet('dashboard-insight', 'Belum ada data kuesioner untuk dianalisis.');
  safeSet('dashboard-trend-label', 'Belum ada tren');
  safeSet('dist-populasi', 'Populasi: 0');
  safeSet('dist-mu', 'μ: —');
  safeSet('distribution-subtitle', 'Belum ada data responden');
  safeSet('outlier-count-title', 'Data Pencilan (0)');
  safeSet('sektor-total-unit', '0');
  safeSet('sektor-legend', 'Belum ada data sektor');
  safeSet('rec-total-count', '0');
  safeSet('paginationInfo', 'Belum ada data');
  safeSet('comp-top-id', 'Belum tersedia');
  safeSet('comp-top-score', '—');
  safeSet('comp-crit-id', 'Belum tersedia');
  safeSet('comp-crit-score', '—');
  safeSet('comparison-intro', 'Belum ada evaluasi tervalidasi dengan skor. Isi dan simpan Form Data terlebih dahulu.');
  safeSet('comp-gap-avg', '—');
  safeSet('comp-gap-text', 'Belum ada data untuk dianalisis.');
  safeSet('bw-median-score', '—');
  safeSet('bw-q1', '—');
  safeSet('bw-q2', '—');
  safeSet('bw-q3', '—');
  safeSet('bw-iqr', '—');
  safeSet('stat-total-rec', '0');
  safeSet('stat-avg-rec', '—');

  document.querySelectorAll('.factor-score').forEach(el => { el.textContent = '—'; });
  document.querySelectorAll('.factor-dev').forEach(el => { el.textContent = 'Belum ada data'; });
  document.querySelectorAll('.factor-badge').forEach(el => {
    el.textContent = '—';
    el.className = 'factor-badge';
  });

  if (window.donutChartInst) {
    window.donutChartInst.data.datasets[0].data = [0, 0, 0, 0];
    window.donutChartInst.update('none');
  }
  if (window.barChartInst) {
    window.barChartInst.data.datasets[0].data = [0, 0, 0, 0, 0, 0];
    window.barChartInst.update('none');
  }
  if (window.spiderChartInst) {
    window.spiderChartInst.data.datasets[0].data = [0, 0, 0, 0, 0, 0];
    window.spiderChartInst.update('none');
  }
  if (window.histChartInst) {
    window.histChartInst.data.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
    window.histChartInst.update('none');
  }
  renderUmkmTable();
  updateDistributionUI();
}

function applyDynamicData() {
  if (!AppState.umkmData.length || !AppState.dashboardStats || !AppState.factorAverages) {
    applyEmptyDashboardState();
    return;
  }
  setDashboardContentVisibility(true);
  const stats = AppState.dashboardStats;
  const fa = AppState.factorAverages;
  const total = Math.max(parseInt(stats.total_umkm) || 0, AppState.totalUmkm);

  updateTotalDisplay(total);
  updateDonutLegend(total);
  
  const sehatCount = parseInt(stats.sehat_count) || 0;
  const totalValid = parseInt(stats.total_valid) || 1;
  const sehatPct   = total > 0 ? Math.round((sehatCount / totalValid) * 100) + '%' : '--';
  safeSet('comparison-intro', `${total} UMKM dengan evaluasi tervalidasi.`);
  safeSet('dashboard-insight', `${total} responden telah mengisi kuesioner.`);
  safeSet('dashboard-trend-label', 'Data terkini');
  safeSet('stat-sehat-pct',   sehatPct);
  const elBest = document.getElementById('stat-best-score');
  if (elBest) elBest.innerHTML = `${(stats.best_score/20).toFixed(2)}<span style="font-size:16px;color:var(--gray-400);font-weight:600"> / 5.0</span>`;
  const elWorst = document.getElementById('stat-worst-score');
  if (elWorst) elWorst.innerHTML = `${(stats.worst_score/20).toFixed(2)}<span style="font-size:16px;color:var(--danger);opacity:0.6;font-weight:600"> / 5.0</span>`;

  if (window.donutChartInst && total > 0) {
    window.donutChartInst.data.datasets[0].data = getHealthCategoryCounts(AppState.umkmData);
    window.donutChartInst.update('none');
  }

  if (fa && window.barChartInst) {
    const live = [
      parseFloat(fa.avg_ov_5) || 0,
      parseFloat(fa.avg_ops_5) || 0,
      parseFloat(fa.avg_weq_5) || 0,
      parseFloat(fa.avg_ins_5) || 0,
      parseFloat(fa.avg_ldi_5) || 0,
      parseFloat(fa.avg_ect_5) || 0,
    ];
    window.barChartInst.data.datasets[0].data = live;
    window.barChartInst.options.animation = { duration: 600, easing: 'easeOutQuart' };
    window.barChartInst.update();
  }

  if (fa && window.spiderChartInst) {
    window.spiderChartInst.data.datasets[0].data = [
      parseFloat(fa.avg_ins_5) || 0,
      parseFloat(fa.avg_ldi_5) || 0,
      parseFloat(fa.avg_weq_5) || 0,
      parseFloat(fa.avg_ov_5) || 0,
      parseFloat(fa.avg_ops_5) || 0,
      parseFloat(fa.avg_ect_5) || 0,
    ];
    window.spiderChartInst.update();
  }

  // Update UMKM & Recommendations bottom metrics dynamically
  const countBuruk = getHealthCategoryCounts(AppState.umkmData)[0];
  safeSet('rec-compliance', '—');
  safeSet('rec-critical', countBuruk + ' Peringatan');
  safeSet('rec-resp-time', '—');
  safeSet('rec-next-scan', '—');

  // Update Intervensi Strategis metrics
  const protokolAktif = countBuruk;
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

  const efisiensi = (sehatPct && sehatPct !== '--') ? sehatPct : '—';
  safeSet('intv-efisiensi', efisiensi);

  if (fa) {
    const insVal = parseFloat(fa.avg_ins_5) || 0;
    const ectVal = parseFloat(fa.avg_ect_5) || 0;
    
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
    ins: parseFloat(fa.avg_ins_5) || 0,
    ldi: parseFloat(fa.avg_ldi_5) || 0,
    weq: parseFloat(fa.avg_weq_5) || 0,
    ov:  parseFloat(fa.avg_ov_5) || 0,
    ops: parseFloat(fa.avg_ops_5) || 0,
    ect: parseFloat(fa.avg_ect_5) || 0
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
      topStatusEl.textContent = isExcellent ? '✓ Status: Sangat Baik' : '✓ Status: Baik';
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
      critStatusEl.textContent = isIntervention ? '! Status: Perlu Intervensi' : '! Status: Perlu Dipantau';
      critStatusEl.className = isIntervention ? 'performer-status status-intervention' : 'performer-status status-excellent';
    }

    // Update Gap Analysis Card
    const avgScorePct = parseFloat(stats.avg_score_pct) || 0;
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

  // --- INTEGRASI SEKTOR ---
  const sektorTotalEl = document.getElementById('sektor-total-unit');
  const sektorLegendEl = document.getElementById('sektor-legend');
  if (sektorTotalEl && sektorLegendEl && AppState.umkmData.length > 0) {
    const totalUmkm = AppState.umkmData.length;
    sektorTotalEl.textContent = totalUmkm;
    
    // Calculate sector distribution
    const counts = {};
    AppState.umkmData.forEach(u => {
      let s = u.sektor || 'Lainnya';
      if (s === '-' || s === '') s = 'Lainnya';
      counts[s] = (counts[s] || 0) + 1;
    });
    
    const colors = ['var(--primary)', 'var(--success)', 'var(--warning)', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e'];
    let htmlStr = '';
    let colorIdx = 0;
    
    const sortedSektors = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    
    sortedSektors.forEach(([sektor, count]) => {
      const pct = Math.round((count / totalUmkm) * 100);
      const c = colors[colorIdx % colors.length];
      htmlStr += `<span><span style="color:${c}">●</span> ${sektor}: ${pct}%</span>`;
      colorIdx++;
    });
    sektorLegendEl.innerHTML = htmlStr;
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
  const counts = getHealthCategoryCounts(AppState.umkmData || []);
  const legends = document.querySelectorAll('.legend-item');
  if (legends.length >= 4) {
    const texts = [`Buruk (${counts[0]})`, `Cukup (${counts[1]})`, `Baik (${counts[2]})`, `Sangat Baik (${counts[3]})`];
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
  const distPop = document.getElementById('dist-populasi');
  if (distPop) distPop.textContent = 'Populasi: ' + total;
  if (total === 0) {
    safeSet('distribution-intro', 'Belum ada evaluasi tervalidasi dengan skor. Isi dan simpan Form Data terlebih dahulu.');
    safeSet('distribution-score-count', '0');
    safeSet('distribution-average', '—');
    safeSet('distribution-median', '—');
    safeSet('distribution-outlier-count', '0');
    safeSet('dist-mu', 'Rata-rata: —');
    safeSet('bw-median-score', '—');
    safeSet('bw-q1', '—');
    safeSet('bw-q2', '—');
    safeSet('bw-q3', '—');
    safeSet('bw-iqr', '—');
    safeSet('outlier-count-title', 'Data Pencilan (0)');
    const tbody = document.getElementById('outlier-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#9ca3af;padding:10px;">Belum ada data untuk dihitung</td></tr>';
    AppState.outliers = [];
    return [0,0,0,0,0,0,0];
  }

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
  
  // Algoritma Interpolasi Halus (Standar Excel QUARTILE.INC)
  function getPercentile(data, p) {
      if (data.length === 0) return 0;
      if (data.length === 1) return data[0];
      const index = p * (data.length - 1);
      const lower = Math.floor(index);
      const upper = lower + 1;
      const weight = index - lower;
      if (upper >= data.length) return data[lower];
      return data[lower] * (1 - weight) + data[upper] * weight;
  }
  
  const q1 = getPercentile(scores5, 0.25);
  const q2 = getPercentile(scores5, 0.50);
  const q3 = getPercentile(scores5, 0.75);
  const iqr = q3 - q1;

  let sum = 0;
  scores5.forEach(s => sum += s);
  const mean = sum / total;
  let sumSq = 0;
  scores5.forEach(s => sumSq += (s - mean)*(s - mean));
  const sd = Math.sqrt(sumSq / total);

  const q1_val = q1, q2_val = q2, q3_val = q3, iqr_val = iqr;
  safeSet('distribution-intro', `${total} evaluasi tervalidasi dengan skor.`);
  safeSet('distribution-score-count', String(total));
  safeSet('distribution-average', mean.toFixed(2));
  safeSet('distribution-median', q2_val.toFixed(2));
  
  safeSet('bw-median-score', q2_val.toFixed(2));
  safeSet('bw-q1', q1_val.toFixed(2));
  safeSet('bw-q2', q2_val.toFixed(2));
  safeSet('bw-q3', q3_val.toFixed(2));
  safeSet('bw-iqr', iqr_val.toFixed(2));

  // Update Median Teks Dinamis
  const muEl = document.getElementById('dist-mu');
  if (muEl) muEl.textContent = 'Rata-rata: ' + mean.toFixed(2);
  
  const lowerBound = q1_val - (1.5 * iqr_val);
  const upperBound = q3_val + (1.5 * iqr_val);

  let outliers = [];
  data.forEach(u => {
     let s5 = u.skor / 20;
     if (s5 === 0) s5 = 1.0;
     if (s5 < lowerBound || s5 > upperBound) {
        // Karena logic IQR, kita tidak memakai Z-score murni untuk tabel ini,
        // tapi kita bisa me-return distance-nya saja sebagai pseudo Z
        let diff = (s5 - q2_val);
        outliers.push({ id: u.id, z: diff, raw: s5 });
     }
  });

  outliers.sort((a,b) => Math.abs(b.z) - Math.abs(a.z));
  AppState.outliers = outliers;
  safeSet('distribution-outlier-count', String(outliers.length));

  const bwWrap = document.getElementById('bw-wrap');
  if (bwWrap) {
    const toPct = (val) => Math.max(0, Math.min(100, ((val - 1.0) / 4.0) * 100));
    document.getElementById('bw-box').style.left = toPct(q1_val) + '%';
    document.getElementById('bw-box').style.width = (toPct(q3_val) - toPct(q1_val)) + '%';
    document.getElementById('bw-median-line').style.left = toPct(q2_val) + '%';
    
    document.querySelectorAll('.bw-dynamic-dot').forEach(d => d.remove());
    outliers.forEach(o => {
       const dot = document.createElement('div');
       dot.className = 'boxplot-dot bw-dynamic-dot';
       dot.style.left = toPct(o.raw) + '%';
       dot.style.background = o.z < 0 ? 'var(--warning)' : 'var(--danger)';
       bwWrap.appendChild(dot);
    });
  }

  const titleEl = document.getElementById('outlier-count-title');
  if (titleEl) titleEl.textContent = 'Data Pencilan (' + outliers.length + ')';

  const tbody = document.getElementById('outlier-tbody');
  if (tbody) {
     tbody.innerHTML = '';
     if (outliers.length === 0) {
         tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#9ca3af;padding:10px;">Tidak ada pencilan (|Z| > 2,0)</td></tr>';
     } else {
         outliers.forEach(o => {
             const tr = document.createElement('tr');
             const color = o.z < 0 ? 'var(--warning)' : 'var(--danger)';
             tr.innerHTML = `<td>#SH-${o.id}</td><td class="z-score" style="color:${color};font-weight:700">${o.raw.toFixed(2)}</td>`;
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

  // Donut chart uses the submitted scores.
  if (window.donutChartInst) {
    window.donutChartInst.data.datasets[0].data = getHealthCategoryCounts(AppState.umkmData);
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
  const roleLabel   = user.role === 'employee' ? 'Pegawai' : 'Pemilik UMKM';
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
      ${user.role === 'owner' && user.invite_code ? infoRow('🔑','Kode Undangan Pegawai', user.invite_code) : ''}
    </div>

    <!-- Quick actions -->
    <div class="card">
      <div style="font-size:11px;font-weight:700;color:var(--gray-400);margin-bottom:16px;letter-spacing:1px">AKSI CEPAT</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        ${quickAction('📋','Isi Kuesioner','Tambah data kesehatan UMKM baru',"navigate('formdata')",'var(--primary-light)','var(--primary)')}
        ${quickAction('📊','Lihat Dasbor','Pantau perkembangan skor',"navigate('home')",'#d1fae5','var(--success)')}
        ${quickAction('🚪','Keluar','Keluar dari sistem',"showModal('logoutModal')",'#fee2e2','var(--danger)')}
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

  const total = AppState.totalUmkm;

  destroyChart('donutChart');
  window.donutChartInst = new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: ['Buruk','Cukup','Baik','Sangat Baik'],
      datasets: [{ data:getHealthCategoryCounts(AppState.umkmData), backgroundColor:['#ef4444','#1a56db','#22c55e','#d1d5db'], borderWidth:3, borderColor:'#fff', hoverOffset:10 }]
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
      datasets: [{ data:[0,0,0,0,0,0], backgroundColor:['#0f9b6e','#d97706','#1a56db','#ef4444','#1a56db','#0891b2'], borderRadius:8, borderSkipped:false }]
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
    data:{ labels:[], datasets:[{ data:[], borderColor:'rgba(255,255,255,0.9)', borderWidth:2, pointRadius:3, pointBackgroundColor:'#fff', fill:true, backgroundColor:'rgba(255,255,255,0.1)', tension:0.4 }] },
    options:{ plugins:{legend:{display:false}}, scales:{y:{display:false},x:{display:false}}, animation:{duration:1000} }
  });
}

function switchChart(mode) {
  document.getElementById('btnBulanan')?.classList.toggle('active', mode==='bulanan');
  document.getElementById('btnQuater')?.classList.toggle('active', mode==='quater');
  if (!window.barChartInst) return;
  const factors = AppState.factorAverages;
  const values = factors ? [
    parseFloat(factors.avg_ov_5) || 0,
    parseFloat(factors.avg_ops_5) || 0,
    parseFloat(factors.avg_weq_5) || 0,
    parseFloat(factors.avg_ins_5) || 0,
    parseFloat(factors.avg_ldi_5) || 0,
    parseFloat(factors.avg_ect_5) || 0,
  ] : [0,0,0,0,0,0];
  window.barChartInst.data.datasets[0].data = values;
  window.barChartInst.options.animation = {duration:700,easing:'easeOutQuart'};
  window.barChartInst.update();
  if (AppState.umkmData.length) showToast(`Tampilan: ${mode==='bulanan'?'Bulanan':'Per Kuartal'}`);
}

function initSpiderChart() {
  AppState.chartsInit.factor = true;
  destroyChart('spiderChart');
  
  const fa = AppState.factorAverages;
  const ins = fa ? (parseFloat(fa.avg_ins_5) || 0) : 0;
  const ldi = fa ? (parseFloat(fa.avg_ldi_5) || 0) : 0;
  const weq = fa ? (parseFloat(fa.avg_weq_5) || 0) : 0;
  const ov  = fa ? (parseFloat(fa.avg_ov_5)  || 0) : 0;
  const ops = fa ? (parseFloat(fa.avg_ops_5) || 0) : 0;
  const ect = fa ? (parseFloat(fa.avg_ect_5) || 0) : 0;

  window.spiderChartInst = new Chart(document.getElementById('spiderChart'), {
    type:'radar',
    data:{labels:['Sumber Daya','Kepemimpinan','Proses','Budaya','Inovasi','Eksternal'],
          datasets:[
            {label:'Skor Aktual',data:[ins,ldi,weq,ov,ops,ect],backgroundColor:'rgba(26,86,219,0.18)',borderColor:'#1a56db',pointBackgroundColor:'#1a56db',borderWidth:2.5,pointRadius:5},
            {label:'Tolok Ukur',data:[0,0,0,0,0,0],backgroundColor:'transparent',borderColor:'#d1d5db',borderDash:[5,5],borderWidth:1.5,pointRadius:3}
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
      if (!t1) return;
      dataArr.forEach((bar, i) => {
        if (vals[i] === t1 || vals[i] === t2) {
          ctx.save();
          ctx.fillStyle = '#1e3a8a';
          ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Puncak', bar.x, bar.y - 8);
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
  
  const mNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
  let monthLabels = [];
  let monthIndices = [];
  let d = new Date();
  for(let i=3; i>=0; i--) {
     let m = d.getMonth() - i;
     if(m < 0) m += 12;
     monthLabels.push(mNames[m]);
     monthIndices.push(m);
  }
  
  // Calculate dynamic data based on UMKM count per month
  let trendData = [0, 0, 0, 0];
  AppState.umkmData.forEach(u => {
      if (u.tanggal) {
          const ud = new Date(u.tanggal);
          const um = ud.getMonth();
          const idx = monthIndices.indexOf(um);
          if (idx !== -1) {
              trendData[idx] += 1;
          }
      }
  });
  
  window.trendChartInst = new Chart(document.getElementById('trendChart'),{
    type:'bar',
    data:{
      labels:monthLabels,
      datasets:[{
        data:trendData,
        backgroundColor:['#d1d5db','#d1d5db','#1a56db','#93c5fd'],
        borderRadius:6,
        borderSkipped:false
      }]
    },
    options:{
      plugins:{legend:{display:false}},
      scales:{y:{display:false},x:{grid:{display:false}}},
      animation:{duration:900,easing:'easeOutElastic',delay:(c)=>c.dataIndex*100}
    }
  });
}

function filterPipa(btn, type) {
  document.querySelectorAll('.pipa-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.pipa-card').forEach(c=>{c.style.display=(type==='all'||c.dataset.priority==='high')?'block':'none';});
}

// ═══════════════════════════════════════════════════════════════
//  EXPORT OUTLIERS
// ═══════════════════════════════════════════════════════════════
function exportOutlierData() {
  if (!AppState.outliers || AppState.outliers.length === 0) {
    showToast('Tidak ada data pencilan untuk diekspor.', 'warning');
    return;
  }
  
  showToast('Menyiapkan berkas CSV data pencilan...', 'success');
  
  // CSV Header
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ID UMKM,Deviasi Skor-Z,Jenis Pencilan\n";
  
  // Add rows
  AppState.outliers.forEach(o => {
    const tipe = o.z < 0 ? "Anomali Bawah (Negatif)" : "Anomali Atas (Positif)";
    const id = "SH-" + o.id;
    csvContent += `${id},${o.z.toFixed(3)},${tipe}\n`;
  });
  
  // Trigger download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute("download", `data_pencilan_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ═══════════════════════════════════════════════════════════════
//  INIT DASHBOARD
// ═══════════════════════════════════════════════════════════════

async function initDashboard() {
  AppState.chartsInit = {};

  // Ambil halaman terakhir yang dibuka
  const savedPage = sessionStorage.getItem('nexa_page');

  const pageToRestore =
    savedPage && document.getElementById('page-' + savedPage)
      ? savedPage
      : 'home';

  // Pulihkan halaman sebelum memuat data Supabase
  navigate(pageToRestore);

  // Muat data UMKM
  await loadUmkmData();

  // Perbarui nama pengguna
  updateUserDisplay();

  // Perbarui tampilan dengan data terbaru
  applyDynamicData();

  if (
    pageToRestore === 'home' ||
    pageToRestore === 'factor' ||
    pageToRestore === 'distribution' ||
    pageToRestore === 'comparison'
  ) {
    await loadDashboardData();
  }
}

  navigate(pageToRestore);