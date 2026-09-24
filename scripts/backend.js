(() => {
  'use strict';

  const cfg = window.BLOOD_JOURNEY_CONFIG || {};
  const endpoint = String(cfg.APPS_SCRIPT_URL || '').trim();
  const configured = Boolean(endpoint && /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i.test(endpoint) && !endpoint.includes('YOUR-DEPLOYMENT-ID'));
  const $ = (sel) => document.querySelector(sel);
  const escapeHtml = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function isConfigured(){ return configured; }

  function getStudentKey(studentName='', className=''){
    const safeIdentity = `${String(className).trim().toLowerCase()}::${String(studentName).trim().toLowerCase().replace(/\s+/g,' ')}`;
    const keyName = `bloodJourneyStudentKey:${safeIdentity || 'default'}`;
    let key = localStorage.getItem(keyName);
    if(!key){
      key = crypto?.randomUUID ? crypto.randomUUID() : `student-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(keyName, key);
    }
    return key;
  }

  async function submitEvaluation(payload){
    if(!configured) return {configured:false};
    const body = {
      action:'submit',
      ...payload,
      student_key:getStudentKey(payload.student_name,payload.class_name)
    };

    // Google Apps Script ContentService is cross-origin. A simple no-cors POST
    // avoids CORS/preflight issues. The MPI keeps the score locally and treats
    // a successfully-dispatched request as submitted.
    await fetch(endpoint, {
      method:'POST',
      mode:'no-cors',
      cache:'no-store',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(body)
    });
    return {configured:true, submitted:true};
  }

  function jsonp(params, timeoutMs=12000){
    if(!configured) return Promise.reject(new Error('Google Apps Script belum dikonfigurasi.'));
    return new Promise((resolve,reject)=>{
      const cb = `__bloodJourneyJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const url = new URL(endpoint);
      Object.entries(params || {}).forEach(([k,v])=>url.searchParams.set(k,String(v)));
      url.searchParams.set('prefix',cb);
      url.searchParams.set('_ts',Date.now());

      const script = document.createElement('script');
      let done = false;
      const cleanup = ()=>{
        if(done) return;
        done = true;
        clearTimeout(timer);
        delete window[cb];
        script.remove();
      };
      window[cb] = (data)=>{ cleanup(); resolve(data); };
      script.onerror = ()=>{ cleanup(); reject(new Error('Tidak dapat menghubungi Google Apps Script.')); };
      const timer = setTimeout(()=>{ cleanup(); reject(new Error('Permintaan leaderboard melewati batas waktu.')); },timeoutMs);
      script.src = url.toString();
      document.head.appendChild(script);
    });
  }

  async function getLeaderboard(limit=30){
    if(!configured) return [];
    const data = await jsonp({action:'leaderboard',limit:Math.max(1,Math.min(50,Number(limit)||30))});
    if(!data?.ok) throw new Error(data?.error || 'Leaderboard gagal dimuat.');
    return Array.isArray(data.rows) ? data.rows : [];
  }

  function showModal(id){ $(id)?.classList.remove('hidden'); document.body.classList.add('modal-open'); }
  function hideModal(id){ $(id)?.classList.add('hidden'); if(!document.querySelector('.modal-backdrop:not(.hidden),.image-zoom-modal:not(.hidden)')) document.body.classList.remove('modal-open'); }

  async function openLeaderboard(){
    showModal('#leaderboardModal');
    const box = $('#leaderboardContent');
    if(!box) return;
    if(!configured){
      box.innerHTML = `<div class="backend-empty"><h3>Google Apps Script belum dikonfigurasi</h3><p>Isi <code>scripts/config.js</code> dengan URL Web App <code>/exec</code>. Evaluasi tetap dapat berjalan secara lokal.</p></div>`;
      return;
    }
    box.innerHTML = `<p class="note">Memuat leaderboard dari Google Sheet…</p>`;
    try{
      const rows = await getLeaderboard(30);
      if(!rows.length){
        box.innerHTML = `<div class="backend-empty"><h3>Belum ada hasil</h3><p>Leaderboard akan terisi setelah siswa menyelesaikan evaluasi.</p></div>`;
        return;
      }
      box.innerHTML = `<div class="leaderboard-list">${rows.map((r,i)=>`
        <div class="leader-row ${i<3?'top':''}">
          <div class="rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
          <div class="leader-name"><strong>${escapeHtml(r.display_name||'Siswa')}</strong><span>Kelas ${escapeHtml(r.class_name||'-')}</span></div>
          <div class="leader-score"><strong>${Number(r.score||0)}</strong><span>${escapeHtml(r.category||'')}</span></div>
        </div>`).join('')}</div>
        <p class="modal-note">Leaderboard hanya menampilkan nama publik yang disederhanakan, kelas, dan nilai terbaik setiap siswa. Data lengkap tetap berada di Google Sheet guru.</p>`;
    }catch(err){
      box.innerHTML = `<div class="backend-error"><h3>Leaderboard gagal dimuat</h3><p>${escapeHtml(err.message||String(err))}</p></div>`;
    }
  }

  function openTeacher(){
    showModal('#teacherModal');
    const box = $('#teacherContent');
    if(!box) return;
    box.innerHTML = `<div class="teacher-login-card">
      <div class="teacher-lock">📊</div>
      <h3>Rekap Guru ada di Google Sheet</h3>
      <p>Versi Google Sheets sengaja tidak menyimpan password guru di MPI. Rekap mentah, penghapusan data, dan dashboard guru dikelola langsung dari Google Sheet pemilik.</p>
      <div class="science-note">Buka Google Sheet yang dipakai untuk Apps Script, lalu gunakan menu <b>Blood Journey</b> → <b>Segarkan Rekap & Leaderboard</b>, <b>Hapus baris hasil yang dipilih</b>, atau <b>Hapus SEMUA hasil siswa</b>.</div>
      <div class="fact-list" style="margin-top:12px">
        <div class="fact"><span class="fact-dot"></span><span><b>Sheet Hasil:</b> seluruh percobaan siswa.</span></div>
        <div class="fact"><span class="fact-dot"></span><span><b>Sheet Rekap:</b> jumlah siswa, rata-rata, ketuntasan, dan rekap per kelas.</span></div>
        <div class="fact"><span class="fact-dot"></span><span><b>Sheet Leaderboard:</b> nilai terbaik siswa.</span></div>
      </div>
      <p class="modal-note">Cara ini lebih sederhana dan lebih aman daripada menaruh kredensial guru di halaman publik GitHub Pages.</p>
    </div>`;
  }

  $('#teacherBtn')?.addEventListener('click',openTeacher);
  $('#closeTeacherBtn')?.addEventListener('click',()=>hideModal('#teacherModal'));
  $('#teacherModal')?.addEventListener('click',e=>{ if(e.target.id==='teacherModal') hideModal('#teacherModal'); });
  $('#closeLeaderboardBtn')?.addEventListener('click',()=>hideModal('#leaderboardModal'));
  $('#leaderboardModal')?.addEventListener('click',e=>{ if(e.target.id==='leaderboardModal') hideModal('#leaderboardModal'); });

  window.BloodBackend = { isConfigured, submitEvaluation, getLeaderboard, openLeaderboard, openTeacher, getStudentKey };
})();
