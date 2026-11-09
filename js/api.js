// TerasMatrix data and authentication client for Supabase.
let supabaseClient;
let cachedUser;

const TokenStore = {
  getUser() {
    if (cachedUser) return cachedUser;
    try {
      cachedUser = JSON.parse(localStorage.getItem('terasmatrix_user') || 'null');
      return cachedUser;
    } catch (error) {
      console.error('Gagal membaca profil tersimpan:', error);
      return null;
    }
  },
  setUser(user) {
    cachedUser = user;
    localStorage.setItem('terasmatrix_user', JSON.stringify(user));
  },
  clearUser() {
    cachedUser = null;
    localStorage.removeItem('terasmatrix_user');
  },
};

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const config = window.TERASMATRIX_SUPABASE;
  if (!window.supabase?.createClient) {
    throw new Error('SDK Supabase tidak dapat dimuat. Periksa koneksi internet dan coba lagi.');
  }
  if (!config?.url || !config?.anonKey) {
    throw new Error('Konfigurasi Supabase belum diisi. Buka js/supabase-config.js dan masukkan URL serta publishable key proyek Anda.');
  }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  return supabaseClient;
}

function apiSuccess(data, message = '') {
  return { ok: true, success: true, status: 200, message, data };
}

function apiFailure(error, fallback = 'Permintaan gagal.') {
  return {
    ok: false,
    success: false,
    status: error?.status || 400,
    message: error?.message || fallback,
    data: error?.details ? { errors: [{ message: error.details }] } : null,
  };
}

async function toAppUser(client, user, profile) {
  let inviteCode = '';
  if (profile.role === 'owner') {
    const { data, error } = await client.rpc('get_my_invite_code');
    if (error) throw error;
    inviteCode = data || '';
  }

  return {
    user_id: user.id,
    email: user.email || '',
    role: profile.role,
    umkm_name: profile.umkm_name,
    invite_code: inviteCode,
    lokasi: profile.lokasi || '',
    sektor: profile.sektor || '',
    omzet: profile.omzet ?? null,
  };
}

async function loadProfile(client, userId) {
  const { data, error } = await client
    .from('profiles')
    .select('id, umkm_name, role, lokasi, sektor, omzet')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

const AuthAPI = {
  async register(payload) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        options: {
          data: {
            umkm_name: payload.umkm_name.trim(),
            role: payload.role,
            lokasi: payload.lokasi || '',
            sektor: payload.sektor || '',
            omzet: payload.omzet ? String(payload.omzet) : '',
            invite_code: payload.invite_code || '',
          },
        },
      });
      if (error) throw error;

      const profile = {
        user_id: data.user.id,
        email: data.user.email || payload.email,
        role: payload.role,
        umkm_name: payload.umkm_name.trim(),
        lokasi: payload.lokasi || '',
        sektor: payload.sektor || '',
        omzet: payload.omzet ?? null,
      };

      if (data.session) {
        const savedProfile = await loadProfile(client, data.user.id);
        const user = await toAppUser(client, data.user, savedProfile);
        TokenStore.setUser(user);
        return apiSuccess(user, 'Registrasi berhasil.');
      }

      return apiSuccess(
        { ...profile, requiresEmailConfirmation: true },
        'Periksa email Anda untuk mengonfirmasi akun sebelum login.',
      );
    } catch (error) {
      return apiFailure(error, 'Registrasi gagal.');
    }
  },

  async login(payload) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      });
      if (error) throw error;

      const profile = await loadProfile(client, data.user.id);
      if (payload.role && payload.role !== profile.role) {
        await client.auth.signOut();
        TokenStore.clearUser();
        return apiFailure({ status: 403, message: `Akun ini terdaftar sebagai ${profile.role}.` });
      }

      const user = await toAppUser(client, data.user, profile);
      TokenStore.setUser(user);
      return apiSuccess(user, 'Berhasil masuk.');
    } catch (error) {
      return apiFailure(error, 'Gagal masuk.');
    }
  },

  async restoreSession() {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      TokenStore.clearUser();
      return null;
    }

    const profile = await loadProfile(client, data.session.user.id);
    const user = await toAppUser(client, data.session.user, profile);
    TokenStore.setUser(user);
    return user;
  },

  async logout() {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    TokenStore.clearUser();
  },

  getUser() {
    return TokenStore.getUser();
  },

  isLoggedIn() {
    return !!TokenStore.getUser();
  },
};

const FormAPI = {
  async submit(answers) {
    try {
      const { data, error } = await getSupabaseClient().rpc('submit_assessment', {
        p_answers: answers,
      });
      if (error) throw error;
      return apiSuccess(data, 'Formulir berhasil disimpan.');
    } catch (error) {
      return apiFailure(error, 'Gagal menyimpan formulir.');
    }
  },
};

const DashboardAPI = {
  async getUmkmList(options = {}) {
    try {
      const client = getSupabaseClient();
      const user = AuthAPI.getUser();
      if (!user?.umkm_name) throw new Error('Profil UMKM tidak ditemukan. Silakan masuk kembali.');

      let query = client
        .from('submissions')
        .select(
          'id, role, submitted_at, score_ins, score_ov, score_ldi, score_weq, score_ops, score_ect, score_composite, score_on_5, health_category, profiles!inner(umkm_name, role, lokasi, sektor, omzet)',
        )
        .eq('profiles.umkm_name', user.umkm_name)
        .eq('profiles.role', 'owner')
        .order('submitted_at', { ascending: false })
        .limit(Math.min(Number(options.limit) || 100, 1000));

      if (options.q) query = query.ilike('profiles.umkm_name', `%${options.q}%`);
      const { data, error } = await query;
      if (error) throw error;

      const rows = data.map((row) => ({
        ...row,
        ...row.profiles,
        score_ins_5: row.score_ins == null ? null : Number(row.score_ins) * 5,
        score_ov_5: row.score_ov == null ? null : Number(row.score_ov) * 5,
        score_ldi_5: row.score_ldi == null ? null : Number(row.score_ldi) * 5,
        score_weq_5: row.score_weq == null ? null : Number(row.score_weq) * 5,
        score_ops_5: row.score_ops == null ? null : Number(row.score_ops) * 5,
        score_ect_5: row.score_ect == null ? null : Number(row.score_ect) * 5,
        profiles: undefined,
      }));

      return apiSuccess({ rows, total: rows.length });
    } catch (error) {
      return apiFailure(error, 'Gagal memuat data UMKM.');
    }
  },

  async getFactorAverages() {
    const result = await this.getUmkmList({ limit: 1000 });
    if (!result.ok) return result;

    const factors = ['ins', 'ov', 'ldi', 'weq', 'ops', 'ect'];
    const averages = {};
    for (const factor of factors) {
      const scores = result.data.rows
        .map((row) => row[`score_${factor}`])
        .filter((score) => score != null)
        .map(Number);
      const average = scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : null;
      averages[`avg_${factor}`] = average;
      averages[`avg_${factor}_5`] = average == null ? null : average * 5;
    }
    return apiSuccess(averages);
  },

  async getStats() {
    const [listResult, factorResult] = await Promise.all([
      this.getUmkmList({ limit: 1000 }),
      this.getFactorAverages(),
    ]);
    if (!listResult.ok) return listResult;
    if (!factorResult.ok) return factorResult;

    const rows = listResult.data.rows;
    const scores = rows.map((row) => Number(row.score_composite)).filter(Number.isFinite);
    return apiSuccess({
      stats: {
        total_umkm: rows.length,
        total_valid: rows.length,
        avg_score_pct: scores.length
          ? (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100
          : 0,
        best_score: scores.length ? Math.max(...scores) * 5 : 0,
        worst_score: scores.length ? Math.min(...scores) * 5 : 0,
        sehat_count: rows.filter((row) => Number(row.score_composite) >= 0.6).length,
      },
      factor_averages: factorResult.data,
    });
  },

  async getMe() {
    try {
      const user = AuthAPI.getUser();
      if (!user?.user_id) throw new Error('Silakan masuk kembali.');
      const profile = await loadProfile(getSupabaseClient(), user.user_id);
      return apiSuccess(await toAppUser(getSupabaseClient(), { id: user.user_id, email: user.email }, profile));
    } catch (error) {
      return apiFailure(error, 'Gagal memuat profil.');
    }
  },
};
