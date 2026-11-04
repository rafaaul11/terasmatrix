/**
 * TerasMatrix — Frontend API Client
 * File ini WAJIB ada. Berisi semua komunikasi ke backend PHP.
 */

const API_BASE = (() => {
  const endpoint = new URL('../backend/api.php', window.location.href);
  if (window.location.port === '5500') endpoint.port = '8000';
  return endpoint.href;
})();

// ── Token & user storage ──────────────────────────────────────
const TokenStore = {
  get()       { return localStorage.getItem('nexa_token'); },
  set(t)      { localStorage.setItem('nexa_token', t); },
  clear()     { localStorage.removeItem('nexa_token'); },
  getUser()   { try { return JSON.parse(localStorage.getItem('nexa_user') || 'null'); } catch { return null; } },
  setUser(u)  { localStorage.setItem('nexa_user', JSON.stringify(u)); },
  clearUser() { localStorage.removeItem('nexa_user'); },
};

// ── Base HTTP wrapper ─────────────────────────────────────────
async function apiCall(action, method = 'GET', body = null) {
  if (window.location.protocol === 'file:') {
    throw new Error('Buka aplikasi melalui http://localhost/...; jangan buka file index.html langsung.');
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = TokenStore.get();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + '?action=' + action, opts);
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server tidak mengembalikan JSON (HTTP ${res.status}). Periksa konfigurasi PHP/API.`);
  }
  return { ok: res.ok && data.success, status: res.status, ...data };
}

// ── AUTH API ──────────────────────────────────────────────────
const AuthAPI = {
  async register(payload) {
    const r = await apiCall('register', 'POST', payload);
    if (r.ok && r.data && r.data.token) {
      TokenStore.set(r.data.token);
      TokenStore.setUser(r.data);
    }
    return r;
  },

  async login(payload) {
    const r = await apiCall('login', 'POST', payload);
    if (r.ok && r.data && r.data.token) {
      TokenStore.set(r.data.token);
      TokenStore.setUser(r.data);
    }
    return r;
  },

  logout() {
    TokenStore.clear();
    TokenStore.clearUser();
  },

  getUser()    { return TokenStore.getUser(); },
  isLoggedIn() { return !!TokenStore.get(); }
};

// ── FORM API ──────────────────────────────────────────────────
const FormAPI = {
  async submit(answers) {
    return apiCall('submit', 'POST', answers);
  }
};

// ── DASHBOARD API ─────────────────────────────────────────────
const DashboardAPI = {
  async getStats()   { return apiCall('dashboard'); },
  async getUmkmList(opts) {
    opts = opts || {};
    const limit  = opts.limit  || 15;
    const offset = opts.offset || 0;
    const q      = opts.q      || '';
    return apiCall('umkm_list&limit=' + limit + '&offset=' + offset + '&q=' + encodeURIComponent(q));
  },
  async getFactorAverages() { return apiCall('factor_averages'); },
  async getMe()  { return apiCall('me'); }
};
