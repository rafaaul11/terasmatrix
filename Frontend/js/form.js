// ── Question definitions ───────────────────────────────────────
const OWNER_QUESTIONS = {
  INS:{ key:'INS',label:'Sumber Daya (INS) — Institutional Resources',color:'#dc2626',bgColor:'#fee2e2',
    icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    description:'Ketersediaan sumber daya kelembagaan dan dukungan eksternal untuk bisnis.',type:'radio3',maxVal:3,
    questions:[
      {id:'ins_oh1',text:'Apakah bisnis Anda memiliki Nomor Induk Berusaha (NIB)?',options:['1 = Tidak','2 = Dalam Proses','3 = Ya']},
      {id:'ins_oh2',text:'Apakah Anda pernah menerima bantuan pendanaan dari pemerintah?',options:['1 = Tidak','2 = Dalam Proses','3 = Ya']},
      {id:'ins_oh3',text:'Apakah Anda pernah mengikuti kegiatan yang diselenggarakan pemerintah?',options:['1 = Tidak','2 = Dalam Proses','3 = Ya']},
      {id:'ins_oh4',text:'Apakah Anda berkolaborasi dengan pedagang atau bisnis lain?',options:['1 = Tidak','2 = Dalam Proses','3 = Ya']},
      {id:'ins_oh5',text:'Apakah Anda menggunakan pemasaran digital untuk mempromosikan bisnis?',options:['1 = Tidak','2 = Dalam Proses','3 = Ya']},
      {id:'ins_oh6',text:'Apa sumber modal keuangan utama bisnis Anda?',options:['1 = Modal Sendiri','2 = Keluarga','3 = Bank/Kredit']},
    ]},
  OPS:{ key:'OPS',label:'Inovasi (OPS) — Operational Stability',color:'#d97706',bgColor:'#fef3c7',
    icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    description:'Stabilitas operasional dan kemampuan bisnis mengelola proses sehari-hari.',type:'likert5',maxVal:5,
    questions:[
      {id:'ops_oh26',text:'Modal kerja mencukupi untuk operasional bisnis sehari-hari'},
      {id:'ops_oh27',text:'Perusahaan mampu membayar gaji karyawan tepat waktu'},
      {id:'ops_oh28',text:'Peralatan/mesin dalam kondisi baik dan berfungsi optimal'},
      {id:'ops_oh29',text:'Rantai pasokan bisnis berjalan lancar tanpa gangguan signifikan'},
      {id:'ops_oh30',text:'Permintaan produk/jasa dapat diprediksi dengan baik'},
      {id:'ops_oh31',text:'Kualitas hubungan jangka panjang bisnis dengan pelanggan sangat baik'},
    ]},
  ECT:{ key:'ECT',label:'Eksternal (ECT) — Economic Connectivity',color:'#0891b2',bgColor:'#e0f2fe',
    icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0891b2" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    description:'Kinerja ekonomi dan konektivitas bisnis dengan pasar eksternal.',type:'likert5',maxVal:5,
    questions:[
      {id:'ect_oh32',text:'Kemampuan bisnis kami menjangkau pasar atau pelanggan baru sangat baik'},
      {id:'ect_oh33',text:'Pertumbuhan penjualan bisnis kami selama setahun terakhir sangat memuaskan'},
      {id:'ect_oh34',text:'Liabilitas bisnis kami (pinjaman, utang) sangat dapat dikelola'},
      {id:'ect_oh35',text:'Situasi arus kas bisnis kami sangat sehat dan stabil'},
    ]},
};

const EMPLOYEE_QUESTIONS = {
  OV:{ key:'OV',label:'Budaya (OV) — Organizational Values',color:'#7c3aed',bgColor:'#ede9fe',
    icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    description:'Evaluasi terhadap nilai-nilai organisasi, budaya, dan integritas.',type:'likert5',maxVal:5,
    questions:[
      {id:'ov_oh18',text:'Saya merasa bebas membicarakan kesulitan kerja dengan pemimpin atau rekan saya'},
      {id:'ov_oh19',text:'Suasana di tempat kerja saya positif dan mendukung'},
      {id:'ov_oh20',text:'Semangat kerja karyawan di tempat kerja saya umumnya tinggi'},
      {id:'ov_oh21',text:'Karyawan di tempat kerja saya saling membantu saat dibutuhkan'},
      {id:'ov_oh22',text:'Tingkat kepercayaan antar karyawan di tempat kerja saya sangat kuat'},
      {id:'ov_oh23',text:'Kerja tim di tempat kerja saya sangat efektif'},
      {id:'ov_oh24',text:'Karyawan di tempat kerja saya saling menghormati'},
      {id:'ov_oh25',text:'Karyawan di tempat kerja saya memandang pekerjaan sebagai bentuk dedikasi'},
    ]},
  LDI:{ key:'LDI',label:'Kepemimpinan (LDI) — Leader Involvement',color:'#059669',bgColor:'#d1fae5',
    icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`,
    description:'Sejauh mana manajemen terlibat aktif dalam operasional dan pengembangan SDM.',type:'likert5',maxVal:5,
    questions:[
      {id:'ldi_oh7', text:'Pemimpin Anda terhubung dengan karyawan secara personal'},
      {id:'ldi_oh8', text:'Pemimpin Anda bertindak sebagai panutan bagi karyawan'},
      {id:'ldi_oh9', text:'Pemimpin Anda terbuka untuk menerapkan ide atau saran dari karyawan'},
      {id:'ldi_oh10',text:'Pemimpin Anda terlibat langsung dalam pekerjaan sehari-hari'},
      {id:'ldi_oh11',text:'Pemimpin Anda aktif berpartisipasi dalam melatih karyawan baru'},
      {id:'ldi_oh12',text:'Pemimpin Anda memperlakukan karyawan secara adil dalam memberi sanksi dan penghargaan'},
    ]},
  WEQ:{ key:'WEQ',label:'Proses (WEQ) — Work Environment Quality',color:'#1a56db',bgColor:'#dbeafe',
    icon:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a56db" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    description:'Kualitas lingkungan dan proses kerja yang mendukung produktivitas karyawan.',type:'likert5',maxVal:5,
    questions:[
      {id:'weq_oh13',text:'Tempat kerja bebas dari kecelakaan kerja'},
      {id:'weq_oh14',text:'Saya puas dengan jam kerja yang ditetapkan di perusahaan ini'},
      {id:'weq_oh15',text:'Beban kerja saya dapat dikelola dengan baik'},
      {id:'weq_oh16',text:'Kondisi kerja fisik (kebisingan, pencahayaan, suhu) nyaman'},
      {id:'weq_oh17',text:'Sebagian besar karyawan bertanggung jawab dan jarang absen tanpa alasan sah'},
    ]},
};

// ── Timer ──────────────────────────────────────────────────────
let _formStartTime = null;

function getCurrentRole() {
  try { return AppState.currentUser?.role || 'owner'; } catch { return 'owner'; }
}
function getActiveGroups() {
  const r = getCurrentRole();
  return r === 'employee'
    ? [EMPLOYEE_QUESTIONS.OV, EMPLOYEE_QUESTIONS.LDI, EMPLOYEE_QUESTIONS.WEQ]
    : [OWNER_QUESTIONS.INS, OWNER_QUESTIONS.OPS, OWNER_QUESTIONS.ECT];
}

// ── Build sidebar calc rows ────────────────────────────────────
function buildCalcRows() {
  const c = document.getElementById('calcRows');
  if (!c) return;
  c.innerHTML = getActiveGroups().map(g => `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
        <span style="font-size:11px;font-weight:600;color:var(--gray-600)">${g.label.split(' — ')[0]}</span>
        <span style="font-size:13px;font-weight:800;color:${g.color}" id="calc-${g.key}">--</span>
      </div>
      <div style="height:7px;background:var(--gray-100);border-radius:20px;overflow:hidden">
        <div id="bar-${g.key}" style="height:100%;width:0%;background:${g.color};border-radius:20px;transition:width 0.5s cubic-bezier(0.4,0,0.2,1)"></div>
      </div>
    </div>`).join('') + `
    <div style="border-top:2px solid var(--gray-200);padding-top:12px;margin-top:8px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;font-weight:700;color:var(--gray-800)">Skor Rata-rata</span>
      <span style="font-size:20px;font-weight:800;color:var(--primary)" id="calc-avg">--</span>
    </div>`;
}

// ── Build form sections ────────────────────────────────────────
function buildFormSections() {
  const c = document.getElementById('formMainContent');
  if (!c) return;
  const role = getCurrentRole();
  const groups = getActiveGroups();
  const rl = role === 'employee' ? '👤 Pegawai' : '👔 Owner';
  const rc = role === 'employee' ? '#7c3aed' : '#1a56db';
  const rb = role === 'employee' ? '#ede9fe'  : '#dbeafe';

  let html = `<div style="background:${rb};border:1.5px solid ${rc};border-radius:var(--radius);padding:14px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <div style="width:36px;height:36px;border-radius:8px;background:${rc};display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
    </div>
    <div>
      <div style="font-size:13px;font-weight:700;color:${rc}">Formulir untuk: ${rl}</div>
      <div style="font-size:11px;color:${rc};opacity:0.75">Isi semua pertanyaan dengan jujur untuk skor kesehatan yang akurat</div>
    </div>
  </div>`;
  groups.forEach(g => { html += buildSectionHTML(g); });
  c.innerHTML = html;

  c.querySelectorAll('input[type="radio"]').forEach(r => {
    r.addEventListener('change', updateLiveCalc);
  });

  // Start timer when form is first interacted
  c.addEventListener('change', () => {
    if (!_formStartTime) _formStartTime = Date.now();
  }, { once: true });
}

// ── Build one section ──────────────────────────────────────────
function buildSectionHTML(cfg) {
  const h5 = cfg.type === 'likert5' ? `
    <div style="display:flex;justify-content:flex-end;margin-bottom:4px;padding-bottom:8px;border-bottom:1px solid var(--gray-100)">
      <div style="display:flex;align-items:center;gap:12px;font-size:10px;font-weight:700;color:var(--gray-400)">
        <span style="margin-right:4px">STS</span>${[1,2,3,4,5].map(v=>`<span style="width:22px;text-align:center">${v}</span>`).join('')}<span style="margin-left:4px">SS</span>
      </div>
    </div>` : '';
  const rows = cfg.questions.map((q,i) => buildRow(q,cfg.type,i)).join('');
  return `<div class="form-section" style="border-top:3px solid ${cfg.color}">
    <div class="section-header">
      <div class="section-icon" style="background:${cfg.bgColor}">${cfg.icon}</div>
      <div><div class="section-title">${cfg.label}</div><div class="section-sub">${cfg.description}</div></div>
    </div>${h5}${rows}</div>`;
}

function buildRow(q, type, idx) {
  if (type === 'likert5') return `
    <div class="form-row" style="flex-wrap:nowrap;gap:0">
      <div class="form-label" style="padding-right:16px;flex:1">${idx+1}.</div>
      <div style="display:flex;gap:12px;flex-shrink:0;align-items:center">
        ${[1,2,3,4,5].map(v=>`
          <label style="cursor:pointer;display:flex;flex-direction:column;align-items:center">
            <input type="radio" name="${q.id}" value="${v}" aria-label="Pertanyaan ${idx+1}, jawaban ${v}" style="position:absolute;opacity:0;width:0;height:0">
            <span class="likert-dot" data-name="${q.id}" data-val="${v}"
              style="width:22px;height:22px;border-radius:50%;border:2px solid var(--gray-300);background:#fff;
                     display:flex;align-items:center;justify-content:center;transition:all 0.15s;cursor:pointer"></span>
          </label>`).join('')}
      </div>
    </div>`;
  if (type === 'radio3') return `
    <div class="form-row" style="flex-direction:column;align-items:flex-start;gap:10px">
      <div class="form-label" style="font-weight:600">${idx+1}.</div>
      <div class="radio-group">
        ${q.options.map((opt,vi)=>`
          <label class="radio-option">
            <input type="radio" name="${q.id}" value="${vi+1}">
            <span class="radio-label">${opt}</span>
          </label>`).join('')}
      </div>
    </div>`;
  return '';
}

// ── Likert dot click via delegation ───────────────────────────
document.addEventListener('click', e => {
  const dot = e.target.closest('.likert-dot');
  if (!dot) return;
  const name = dot.dataset.name, val = dot.dataset.val;
  if (!name || !val) return;
  document.querySelectorAll(`.likert-dot[data-name="${name}"]`).forEach(d => {
    const active = parseInt(d.dataset.val) <= parseInt(val);
    d.style.background  = active ? 'var(--primary)' : '#fff';
    d.style.borderColor = active ? 'var(--primary)' : 'var(--gray-300)';
  });
  const radio = document.querySelector(`input[name="${name}"][value="${val}"]`);
  if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change',{bubbles:true})); }
  if (!_formStartTime) _formStartTime = Date.now();
});

// ── Live Calculation ───────────────────────────────────────────
function updateLiveCalc() {
  const groups = getActiveGroups();
  let totalNorm = 0, countGroups = 0;
  groups.forEach(g => {
    const ve = document.getElementById(`calc-${g.key}`);
    const be = document.getElementById(`bar-${g.key}`);
    if (!ve || !be) return;
    const vals = g.questions.map(q => {
      const el = document.querySelector(`input[name="${q.id}"]:checked`);
      return el ? parseFloat(el.value) : null;
    }).filter(v => v !== null);
    if (!vals.length) { ve.textContent='--'; be.style.width='0%'; return; }
    const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
    const pct = Math.round((avg/g.maxVal)*100);
    ve.textContent = avg.toFixed(2);
    const col = pct>=70?'var(--success)':pct>=45?'#d97706':'var(--danger)';
    ve.style.color = col; be.style.width=pct+'%'; be.style.background=col;
    totalNorm += (avg/g.maxVal); countGroups++;
  });

  const ae = document.getElementById('calc-avg');
  const ce = document.getElementById('health-cat');
  const se = document.getElementById('health-sub');
  if (!countGroups) { if(ae) ae.textContent='--'; if(ce){ce.textContent='--';ce.style.color='var(--gray-400)';}return; }

  const norm = totalNorm/countGroups;
  const disp = (norm*5).toFixed(2);
  if (ae) ae.textContent = disp;
  let cat='PERLU PERHATIAN', catCol='#dc2626';
  if(norm>=0.80){cat='SANGAT BAIK';catCol='#059669';}
  else if(norm>=0.60){cat='BAIK';catCol='#059669';}
  else if(norm>=0.40){cat='CUKUP';catCol='#d97706';}
  if(ce){ce.textContent=cat;ce.style.color=catCol;}
  if(se) se.textContent=`Skor Rata-rata: ${disp} / 5.0`;
}

// ── Collect all answers ────────────────────────────────────────
function collectAnswers() {
  const out = {};
  getActiveGroups().forEach(g => {
    g.questions.forEach(q => {
      const el = document.querySelector(`input[name="${q.id}"]:checked`);
      if (el) out[q.id] = parseInt(el.value);
    });
  });
  return out;
}

// ── Count unanswered ───────────────────────────────────────────
function countUnanswered() {
  let count = 0;
  getActiveGroups().forEach(g => {
    g.questions.forEach(q => {
      const el = document.querySelector(`input[name="${q.id}"]:checked`);
      if (!el) count++;
    });
  });
  return count;
}

// ── Format duration ────────────────────────────────────────────
function formatDuration(ms) {
  const s = Math.floor(ms/1000);
  if (s < 60) return `${s} detik`;
  const m = Math.floor(s/60), rem = s%60;
  return rem > 0 ? `${m} menit ${rem} detik` : `${m} menit`;
}

// ── Save evaluasi → send to backend ───────────────────────────
async function saveEvaluasi() {
  const unanswered = countUnanswered();
  if (unanswered > 0) {
    showToast(`Masih ada ${unanswered} pertanyaan belum dijawab.`, 'error');
    return;
  }

  const btn = document.getElementById('btnSaveEval');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  const answers = collectAnswers();
  const elapsed = _formStartTime ? Date.now() - _formStartTime : 0;

  try {
    const res = await FormAPI.submit(answers);
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan Evaluasi'; }

    if (!res.ok) {
      // Tampilkan error detail dari server
      let errMsg = res.message || 'Gagal menyimpan.';
      if (res.data?.errors?.length) {
        // Ambil error faktor (jawaban), bukan error profil
        const factorErrors = res.data.errors.filter(e => e.factor);
        if (factorErrors.length) {
          errMsg = `${factorErrors.length} pertanyaan tidak valid:\n` +
            factorErrors.slice(0, 3).map(e => `• ${e.message}`).join('\n');
        }
      }
      showToast(errMsg, 'error');
      return;
    }

    // Reload data dari database agar data asli yang baru disimpan langsung ditarik ke aplikasi
    if (typeof loadUmkmData === 'function') {
      await loadUmkmData();
    }

    // Refresh semua chart & data dengan total terbaru
    if (typeof refreshAllCharts === 'function') refreshAllCharts();

    showFeedbackPopup(res.data, elapsed);
    _formStartTime = null;

  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan Evaluasi'; }
    showToast('Tidak dapat terhubung ke server. Pastikan XAMPP aktif.', 'error');
  }
}

// ── Feedback popup ─────────────────────────────────────────────
function showFeedbackPopup(data, elapsed) {
  const composite = data.composite;
  const scores    = data.scores || {};
  const duration  = formatDuration(elapsed);

  // Build per-factor rows
  const factorRows = Object.entries(scores).map(([k,s]) => {
    const labels = {INS:'Sumber Daya',OPS:'Inovasi',ECT:'Eksternal',OV:'Budaya',LDI:'Kepemimpinan',WEQ:'Proses'};
    const colors = {INS:'#dc2626',OPS:'#d97706',ECT:'#0891b2',OV:'#7c3aed',LDI:'#059669',WEQ:'#1a56db'};
    const pct = s.normScore ? Math.round(s.normScore*100) : 0;
    const c = colors[k]||'var(--primary)';
    return `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:12px;font-weight:600;color:var(--gray-700)">${labels[k]||k}</span>
          <span style="font-size:12px;font-weight:800;color:${c}">${s.scoreOn5||'--'} / 5.0</span>
        </div>
        <div style="height:6px;background:var(--gray-100);border-radius:20px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${c};border-radius:20px;transition:width 0.8s ease"></div>
        </div>
      </div>`;
  }).join('');

  const catColor = composite?.category === 'SANGAT BAIK' || composite?.category === 'BAIK'
    ? '#059669' : composite?.category === 'CUKUP' ? '#d97706' : '#dc2626';

  const popup = document.createElement('div');
  popup.id = 'feedbackPopup';
  popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:600;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.25s ease';
  popup.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:32px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.2);animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)">
      <!-- Success icon -->
      <div style="text-align:center;margin-bottom:20px">
        <div style="width:72px;height:72px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style="font-size:22px;font-weight:800;color:var(--gray-900);margin-bottom:4px">Kuesioner Berhasil Disimpan!</h2>
        <p style="font-size:13px;color:var(--gray-500)">Data penilaian berhasil disimpan ke database TerasMatrix.</p>
      </div>

      <!-- Stats row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="background:var(--primary-light);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:11px;font-weight:700;color:var(--primary);margin-bottom:4px">WAKTU PENGERJAAN</div>
          <div style="font-size:18px;font-weight:800;color:var(--gray-900)">${duration}</div>
        </div>
        <div style="background:${catColor === '#059669' ? '#d1fae5' : catColor === '#d97706' ? '#fef3c7' : '#fee2e2'};border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:11px;font-weight:700;color:${catColor};margin-bottom:4px">KATEGORI KESEHATAN</div>
          <div style="font-size:15px;font-weight:800;color:${catColor}">${composite?.category || '--'}</div>
        </div>
      </div>

      <!-- Score -->
      <div style="background:linear-gradient(135deg,#1e3a8a,#1a56db);border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);margin-bottom:4px">SKOR KOMPOSIT</div>
        <div style="font-size:36px;font-weight:800;color:#fff;line-height:1">${composite?.scoreOn5 || '--'} <span style="font-size:16px;opacity:0.7">/ 5.0</span></div>
      </div>

      <!-- Per-factor breakdown -->
      <div style="margin-bottom:20px">${factorRows}</div>

      <!-- Warnings if any -->
      ${data.warnings?.length ? `<div style="background:#fef3c7;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#92400e"><strong>⚠ Catatan:</strong> ${data.warnings[0]?.message||''}</div>` : ''}

      <!-- Submission ID -->
      <div style="font-size:11px;color:var(--gray-400);text-align:center;margin-bottom:16px">ID Submission: #${data.submission_id||'--'}</div>

      <!-- Buttons -->
      <div style="display:flex;gap:10px">
        <button onclick="document.getElementById('feedbackPopup').remove();navigate('home')"
          style="flex:1;padding:12px;background:var(--primary);border:none;border-radius:10px;color:#fff;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit">
          Lihat Dashboard
        </button>
        <button onclick="document.getElementById('feedbackPopup').remove()"
          style="padding:12px 18px;background:none;border:1.5px solid var(--gray-200);border-radius:10px;color:var(--gray-700);font-weight:600;font-size:14px;cursor:pointer;font-family:inherit">
          Tutup
        </button>
      </div>
    </div>
    <style>
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes slideUp{from{opacity:0;transform:translateY(30px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
    </style>`;
  document.body.appendChild(popup);
  popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
}

// ── Reset & rebuild form ───────────────────────────────────────
function resetAndBuildForm() {
  _formStartTime = null;
  buildCalcRows();
  buildFormSections();
  updateLiveCalc();
}