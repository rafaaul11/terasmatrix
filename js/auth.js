// ── Auth state ─────────────────────────────────────────────────
let selectedRole    = 'owner';
let currentAuthView = 'landing';
let _regTemp        = {};

// ── View switcher ──────────────────────────────────────────────
async function showView(view) {
  if (view === 'logout') {
    try {
      await AuthAPI.logout();
    } catch (error) {
      showToast(error.message || 'Gagal keluar dari akun.', 'error');
      return;
    }
    sessionStorage.removeItem('nexa_page');
    if (typeof AppState !== 'undefined') { AppState.currentUser = null; AppState.chartsInit = {}; }
    selectedRole = 'owner';
    showView('landing');
    return;
  }

  const previousView = sessionStorage.getItem('nexa_view');
  currentAuthView = view;
  ['landing-page','auth-page','dashboard-app'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  if (view === 'landing') {
    sessionStorage.setItem('nexa_view', 'landing');
    document.getElementById('landing-page')?.classList.add('active');
  } else if (['login','register','register2'].includes(view)) {
    sessionStorage.setItem('nexa_view', view === 'register2' ? 'register' : view);
    document.getElementById('auth-page')?.classList.add('active');
    renderAuthView(view);
  } else if (view === 'dashboard') {
    sessionStorage.setItem('nexa_view', 'dashboard');
    if (previousView !== 'dashboard') sessionStorage.setItem('nexa_page', 'home');
    document.getElementById('dashboard-app')?.classList.add('active');
    initDashboard();
  }
}

// ── Render form container ──────────────────────────────────────
function renderAuthView(view) {
  const c = document.getElementById('auth-form-container');
  if (!c) return;
  if (view === 'login')     c.innerHTML = renderLoginForm();
  if (view === 'register')  c.innerHTML = renderRegisterForm();
  if (view === 'register2') c.innerHTML = renderRegisterForm2();
}

// ── Role cards HTML ────────────────────────────────────────────
function roleCardsHTML() {
  const o = selectedRole === 'owner', e = selectedRole === 'employee';
  return `
    <div class="role-selector">
      <div class="role-card ${o?'selected':''}" onclick="selectRole('owner')">
        <div class="role-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${o?'#fff':'#6b7280'}" stroke-width="2">
            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
            <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/>
          </svg>
        </div>
        <div class="role-card-title">Pemilik UMKM</div>
        <div class="role-card-desc">Pemilik usaha</div>
      </div>
      <div class="role-card ${e?'selected':''}" onclick="selectRole('employee')">
        <div class="role-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${e?'#fff':'#6b7280'}" stroke-width="2">
            <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
          </svg>
        </div>
        <div class="role-card-title">Pegawai</div>
        <div class="role-card-desc">Karyawan UMKM</div>
      </div>
    </div>`;
}

// ── Login form ─────────────────────────────────────────────────
function renderLoginForm() {
  return `
    <div class="auth-form-wrap">
      <h1 class="auth-title">Selamat Datang Kembali</h1>
      <p class="auth-subtitle">Masuk untuk melihat dasbor dan laporan kesehatan organisasi Anda.</p>
      ${roleCardsHTML()}
      <div class="form-group">
        <label class="field-label">Email Bisnis</label>
        <div class="field-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <input type="email" id="loginEmail" placeholder="email@bisnis.com" autocomplete="email">
        </div>
      </div>
      <div class="form-group">
        <div class="forgot-row">
          <label class="field-label">Kata Sandi</label>
          <a class="forgot-link" onclick="showToast('Link reset dikirim ke email Anda','success')">Lupa Kata Sandi?</a>
        </div>
        <div class="field-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input type="password" id="loginPassword" placeholder="••••••••">
          <span class="field-eye" onclick="togglePwd('loginPassword')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
        </div>
      </div>
      <button class="btn-auth" id="btnLogin" onclick="handleLogin()">Masuk</button>
      <p class="auth-link-text">Belum punya akun? <a onclick="showView('register')">Daftar di sini</a></p>
    </div>`;
}

// ── Register step 1 ────────────────────────────────────────────
function renderRegisterForm() {
  return `
    <div class="auth-form-wrap">
      <h1 class="auth-title">Daftarkan Organisasi Anda</h1>
      <p class="auth-subtitle">Awali langkah Anda menuju pengelolaan data yang lebih akurat.</p>
      ${roleCardsHTML()}
      <div class="form-group">
        <label class="field-label">Nama UMKM</label>
        <div class="field-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <input type="text" id="regName" placeholder="PT. Medika Digital Nusantara" value="${_regTemp.name||''}">
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">Email Bisnis</label>
        <div class="field-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <input type="email" id="regEmail" placeholder="admin@terasmatrix.id" value="${_regTemp.email||''}">
        </div>
      </div>
      <div class="form-group-half">
        <div>
          <label class="field-label">Kata Sandi</label>
          <div class="field-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input type="password" id="regPwd" placeholder="Minimal 8 karakter">
          </div>
        </div>
        <div>
          <label class="field-label">Konfirmasi Kata Sandi</label>
          <div class="field-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <input type="password" id="regPwdConfirm" placeholder="Ulangi kata sandi">
          </div>
        </div>
      </div>
      <div class="checkbox-wrap">
        <input type="checkbox" id="regAgree">
        <label class="checkbox-label" for="regAgree">Saya menyetujui <a>Syarat &amp; Ketentuan</a> serta <a>Kebijakan Privasi</a> TerasMatrix.</label>
      </div>
      <button class="btn-auth" id="btnReg1" onclick="handleRegisterStep1()">Lanjut →</button>
      <p class="auth-link-text">Sudah memiliki akun? <a onclick="showView('login')">Masuk di sini</a></p>
    </div>`;
}

// ── Register step 2 ────────────────────────────────────────────
function renderRegisterForm2() {
  return `
    <div class="auth-form-wrap">
      <h1 class="auth-title">Registrasi Profil Bisnis</h1>
      <p class="auth-subtitle">Isi informasi dasar agar Anda dapat memulai analisis kesehatan UMKM.</p>
      <div class="form-group">
        <label class="field-label">Nama UMKM</label>
        <div class="field-wrap">
          <input type="text" id="reg2Name" placeholder="Masukkan nama resmi bisnis Anda" value="${_regTemp.name||''}">
        </div>
      </div>
      ${_regTemp.role === 'employee' ? `
      <div class="form-group">
        <label class="field-label" for="reg2InviteCode">Kode Undangan dari Pemilik UMKM</label>
        <div class="field-wrap">
          <input type="text" id="reg2InviteCode" placeholder="Masukkan kode undangan" autocomplete="off" maxlength="10">
        </div>
        <div class="field-hint">Minta kode ini kepada pemilik UMKM agar akun Anda terhubung ke usaha yang benar.</div>
      </div>` : ''}
      <div class="form-group-half">
        <div>
          <label class="field-label">Lokasi UMKM</label>
          <div class="field-wrap">
            <select id="reg2Lokasi">
              <option value="">Pilih Provinsi/Kota</option>
              <option>DKI Jakarta</option><option>Jawa Barat</option><option>Jawa Tengah</option>
              <option>Jawa Timur</option><option>Banten</option><option>Bali</option>
              <option>Sumatera Utara</option><option>Sulawesi Selatan</option><option>Kalimantan Timur</option>
              <option>Kalimantan Selatan</option><option>Nusa Tenggara Barat</option><option>Lampung</option>
            </select>
          </div>
        </div>
        <div>
          <label class="field-label">Sektor UMKM</label>
          <div class="field-wrap">
            <select id="reg2Sektor">
              <option value="">Pilih Bidang Industri</option>
              <option>Makanan &amp; Minuman</option>
              <option value="Fashion">Busana</option>
              <option value="Grosir &amp; Retail">Grosir &amp; Ritel</option>
            </select>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="field-label">Omzet per Bulan</label>
        <div class="field-number-wrap">
          <span class="field-prefix">IDR</span>
          <input type="number" id="reg2Omzet" placeholder="0" min="0">
        </div>
        <div class="field-hint">Masukkan perkiraan rata-rata pendapatan selama enam bulan terakhir.</div>
      </div>
      <button class="btn-auth" id="btnReg2" onclick="handleRegisterStep2()">Simpan &amp; Daftar Akun →</button>
      <p class="auth-link-text"><a onclick="showView('register')">← Kembali</a></p>
    </div>`;
}

// ── Select role ────────────────────────────────────────────────
function selectRole(role) {
  selectedRole = role;
  renderAuthView(currentAuthView);
}

function togglePwd(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

// ── Set button loading ─────────────────────────────────────────
function setLoading(btnId, loading, text = '') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Memproses...' : text;
}

// ── HANDLE LOGIN ───────────────────────────────────────────────
async function handleLogin() {
  const email = (document.getElementById('loginEmail')?.value || '').trim();
  const pwd   = (document.getElementById('loginPassword')?.value || '').trim();
  if (!email || !pwd) { showToast('Harap isi email dan kata sandi.', 'error'); return; }

  setLoading('btnLogin', true, 'Masuk');
  try {
    const res = await AuthAPI.login({ email, password: pwd, role: selectedRole });
    if (!res.ok) {
      showToast(res.message || 'Gagal masuk.', 'error');
      setLoading('btnLogin', false, 'Masuk');
      return;
    }
    const safeName = (res.data?.umkm_name && res.data.umkm_name !== 'undefined')
      ? res.data.umkm_name
      : res.data?.email?.split('@')[0] || 'Pengguna';
    AppState.currentUser = {
      name:      safeName,
      email:     res.data?.email      || email,
      role:      res.data?.role       || selectedRole,
      user_id:   res.data?.user_id,
      invite_code: res.data?.invite_code || '',
      umkm_name: safeName,
      lokasi:    res.data?.lokasi     || '',
      sektor:    res.data?.sektor     || '',
      omzet:     res.data?.omzet      ?? null,
    };
    showToast(`Berhasil masuk! Selamat datang, ${safeName}.`, 'success');
    setTimeout(() => showView('dashboard'), 400);
  } catch(e) {
    showToast(e.message || 'Tidak dapat terhubung ke Supabase. Periksa konfigurasi dan koneksi internet.', 'error');
    setLoading('btnLogin', false, 'Masuk');
  }
}

// ── HANDLE REGISTER STEP 1 ─────────────────────────────────────
async function handleRegisterStep1() {
  const name  = (document.getElementById('regName')?.value  || '').trim();
  const email = (document.getElementById('regEmail')?.value || '').trim();
  const pwd   = (document.getElementById('regPwd')?.value   || '').trim();
  const pwdC  = (document.getElementById('regPwdConfirm')?.value || '').trim();
  const agree = document.getElementById('regAgree')?.checked;

  if (!name)  { showToast('Nama UMKM wajib diisi.', 'error'); return; }
  if (!email || !email.includes('@')) { showToast('Format email tidak valid.', 'error'); return; }
  if (pwd.length < 8) { showToast('Kata sandi minimal 8 karakter.', 'error'); return; }
  if (pwd !== pwdC)   { showToast('Kata sandi tidak cocok.', 'error'); return; }
  if (!agree)         { showToast('Harap setujui syarat & ketentuan.', 'error'); return; }

  _regTemp = { name, email, pwd, role: selectedRole };
  showView('register2');
}

// ── HANDLE REGISTER STEP 2 ────────────────────────────────────
async function handleRegisterStep2() {
  const lokasi = document.getElementById('reg2Lokasi')?.value;
  const sektor = document.getElementById('reg2Sektor')?.value;
  const omzet  = document.getElementById('reg2Omzet')?.value;
  const inviteCode = (document.getElementById('reg2InviteCode')?.value || '').trim().toUpperCase();
  const nameField = (document.getElementById('reg2Name')?.value || '').trim();
  // Gunakan nama dari step 1 jika field kosong
  const finalName = nameField || _regTemp.name || '';

  if (!finalName) { showToast('Nama UMKM wajib diisi.', 'error'); return; }
  if (!lokasi)    { showToast('Pilih lokasi UMKM.', 'error'); return; }
  if (!sektor)    { showToast('Pilih sektor UMKM.', 'error'); return; }
  if (_regTemp.role === 'employee' && !inviteCode) {
    showToast('Masukkan kode undangan dari pemilik UMKM.', 'error');
    return;
  }

  setLoading('btnReg2', true, 'Simpan & Daftar Akun →');
  try {
    const res = await AuthAPI.register({
      umkm_name: finalName,
      email:     _regTemp.email,
      password:  _regTemp.pwd,
      role:      _regTemp.role || selectedRole,
      lokasi,
      sektor,
      omzet: omzet ? parseInt(omzet) : null,
      invite_code: inviteCode,
    });

    if (!res.ok) {
      showToast(res.message || 'Registrasi gagal.', 'error');
      setLoading('btnReg2', false, 'Simpan & Daftar Akun →');
      return;
    }

    if (res.data?.requiresEmailConfirmation) {
      _regTemp = {};
      showToast(res.message, 'success');
      showView('login');
      return;
    }

    // Pastikan nama tidak pernah undefined
    const savedName = res.data?.umkm_name || finalName || _regTemp.email?.split('@')[0] || 'Pengguna';

    AppState.currentUser = {
      name:      savedName,
      email:     res.data?.email     || _regTemp.email,
      role:      res.data?.role      || _regTemp.role,
      user_id:   res.data?.user_id,
      invite_code: res.data?.invite_code || '',
      umkm_name: savedName,
      lokasi:    res.data?.lokasi    || lokasi || '',
      sektor:    res.data?.sektor    || sektor || '',
      omzet:     res.data?.omzet     ?? (omzet ? parseInt(omzet) : null),
    };
    _regTemp = {};
    showToast(`Registrasi berhasil! Selamat datang, ${savedName}.`, 'success');
    setTimeout(() => showView('dashboard'), 400);
  } catch(e) {
    showToast(e.message || 'Tidak dapat terhubung ke Supabase. Periksa konfigurasi dan koneksi internet.', 'error');
    setLoading('btnReg2', false, 'Simpan & Daftar Akun →');
  }
}

// ── Check session on load ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const user = await AuthAPI.restoreSession();
    if (user) {
    // Bersihkan nilai yang mungkin undefined
    const safeName = (user.umkm_name && user.umkm_name !== 'undefined')
      ? user.umkm_name
      : (user.name && user.name !== 'undefined')
        ? user.name
        : user.email?.split('@')[0] || 'Pengguna';

    AppState.currentUser = {
      name:      safeName,
      email:     user.email     || '',
      role:      user.role      || 'owner',
      user_id:   user.user_id,
      invite_code: user.invite_code || '',
      umkm_name: safeName,
      lokasi:    user.lokasi    || '',
      sektor:    user.sektor    || '',
      omzet:     user.omzet     ?? null,
    };
    showView('dashboard');
      return;
    }
  } catch (error) {
    console.error('Gagal memulihkan sesi Supabase:', error);
    showToast(error.message || 'Sesi tidak dapat dipulihkan.', 'error');
  }

  const savedView = sessionStorage.getItem('nexa_view');
  showView(savedView === 'login' || savedView === 'register' ? savedView : 'landing');
});