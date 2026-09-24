(() => {
  'use strict';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

  const screen = $('#screen');
  const nextBtn = $('#nextBtn');
  const backBtn = $('#backBtn');
  const menuBtn = $('#menuBtn');
  const resetBtn = $('#resetBtn');
  const soundToggleBtn = $('#soundToggleBtn');
  const bgmAudio = $('#bgmAudio');
  const menuModal = $('#menuModal');
  const closeMenuBtn = $('#closeMenuBtn');
  const stageGrid = $('#stageGrid');
  const stageLabel = $('#stageLabel');
  const progressFill = $('#progressFill');
  const progressText = $('#progressText');
  const toastEl = $('#toast');

  const ASSET = {
    bg: 'assets/background/',
    science: 'assets/science/',
    health: 'assets/health/',
    mascots: 'assets/mascots/',
    menu: 'assets/icons/menu/',
    progress: 'assets/icons/progress/',
    quiz: 'assets/icons/quiz/'
  };

  const stages = [
    {id:'home',label:'Pembuka',icon:'menu_home.webp',page:'opening'},
    {id:'objectives',label:'Tujuan',icon:'menu_objectives.webp',page:'objectives'},
    {id:'material',label:'Materi',icon:'menu_material.webp',page:'roadmap'},
    {id:'missions',label:'Pembelajaran Bertahap',icon:'menu_missions.webp',page:'missionsIntro'},
    {id:'quiz',label:'Evaluasi',icon:'menu_quiz.webp',page:'quizIntro'},
    {id:'game',label:'Game',icon:'menu_game.webp',page:'game'}
  ];

  const pageOrder = [
    'opening','identity','objectives','roadmap','heart','vessels','circulation','cells','disorders',
    'missionsIntro','missionHeart','missionVessels','missionCirculation','missionCells','missionCases','missionSummary',
    'quizIntro','quiz','result','game','finish'
  ];

  const pageStage = {
    opening:0, identity:0, objectives:1, roadmap:2, heart:2, vessels:2, circulation:2, cells:2, disorders:2,
    missionsIntro:3, missionHeart:3, missionVessels:3, missionCirculation:3, missionCells:3, missionCases:3, missionSummary:3,
    quizIntro:4, quiz:4, result:4, game:5, finish:5
  };

  function freshGame(){
    return {
      pulmonary:false, systemic:false, cells:false, score:0,
      pRound:0, sRound:0, cRound:0,
      feedback:{pulmonary:'', systemic:'', cells:''},
      logP:[], logS:[], logC:[]
    };
  }

  const defaultState = () => ({
    page:'opening', unlockedStage:0, completedStages:[], name:'', className:'',
    checks:{heart:false,vessels:false,circulation:false,cells:false,disorders:false},
    materialsVisited:{},
    mission:{heart:false,vessels:false,circulation:false,cells:false,cases:false},
    missionScores:{heart:0,vessels:0,cases:0},
    quiz:{index:0,answers:{},done:false,score:0,correctCount:0,attempt:1,syncStatus:'local',resultId:null},
    game:freshGame(),
    soundOn:true,
    sim:{step:0, mode:'full'},
    temp:{orderPulmonary:[],orderSystemic:[],missionOrder:[],gamePulmonary:[],gameSystemic:[]}
  });

  let state = loadState();

  function loadState(){
    try{
      const saved = sessionStorage.getItem('bloodJourneyV25');
      const base = defaultState();
      if(!saved) return base;
      const parsed = JSON.parse(saved);
      const merged = Object.assign(base, parsed);
      merged.game = Object.assign(base.game, parsed.game||{});
      merged.sim = Object.assign(base.sim, parsed.sim||{});
      merged.quiz = Object.assign(base.quiz, parsed.quiz||{});
      merged.temp = Object.assign(base.temp, parsed.temp||{});
      if(typeof merged.soundOn !== 'boolean') merged.soundOn = true;
      return merged;
    }catch(e){ return defaultState(); }
  }
  function saveState(){
    sessionStorage.setItem('bloodJourneyV25', JSON.stringify(state));
  }
  function setPage(page){ state.page = page; saveState(); render(); }
  function unlock(stageIndex){ if(state.unlockedStage < stageIndex){ state.unlockedStage = stageIndex; saveState(); toast(`Tahap ${stages[stageIndex].label} terbuka!`); } }
  function completeStage(stageIndex){ if(!state.completedStages.includes(stageIndex)){ state.completedStages.push(stageIndex); saveState(); } }
  function toast(msg){ toastEl.textContent=msg; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),1800); }

  function esc(v=''){ return String(v).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function mascot(file,alt=''){ return `<img src="${ASSET.mascots}${file}" alt="${esc(alt)}">`; }
  function sci(file,alt=''){ return `<img src="${ASSET.science}${file}" alt="${esc(alt)}">`; }
  function backendConfigured(){ return Boolean(window.BloodBackend?.isConfigured?.()); }

  function progressPercent(){
    const idx = Math.max(0,pageOrder.indexOf(state.page));
    let p = idx/(pageOrder.length-1);
    if(state.page==='quiz') p = (16 + Math.min(1,(state.quiz.index+1)/20)*2)/(pageOrder.length-1);
    return Math.min(100,Math.max(0,Math.round(p*100)));
  }

  function setBackground(){
    const cls = ['bg-opening','bg-objectives','bg-roadmap','bg-material','bg-missions','bg-quiz','bg-result','bg-game','bg-finish'];
    document.body.classList.remove(...cls);
    const p=state.page;
    if(['opening','identity'].includes(p)) document.body.classList.add('bg-opening');
    else if(p==='objectives') document.body.classList.add('bg-objectives');
    else if(p==='roadmap') document.body.classList.add('bg-roadmap');
    else if(['heart','vessels','circulation','cells','disorders'].includes(p)) document.body.classList.add('bg-material');
    else if(p.startsWith('mission')) document.body.classList.add('bg-missions');
    else if(['quizIntro','quiz'].includes(p)) document.body.classList.add('bg-quiz');
    else if(p==='result') document.body.classList.add('bg-result');
    else if(p==='game') document.body.classList.add('bg-game');
    else document.body.classList.add('bg-finish');
  }

  function updateTopbar(){
    const si=pageStage[state.page] ?? 0;
    stageLabel.textContent = `${stages[si].label}${state.name ? ` • ${state.name}` : ''}`;
    const p=progressPercent(); progressFill.style.width=`${p}%`; progressText.textContent=`${p}%`;
    if(soundToggleBtn){
      soundToggleBtn.textContent = state.soundOn ? '🔊' : '🔇';
      soundToggleBtn.setAttribute('aria-pressed', String(state.soundOn));
      soundToggleBtn.title = state.soundOn ? 'Suara aktif' : 'Suara nonaktif';
    }
  }

  function stateIcon(stageIndex){
    if(stageIndex>state.unlockedStage) return 'status_locked.webp';
    if(state.completedStages.includes(stageIndex)) return 'status_done.webp';
    if(stageIndex===pageStage[state.page]) return 'status_current.webp';
    return 'status_open.webp';
  }

  function renderStageGrid(){
    stageGrid.innerHTML=stages.map((s,i)=>{
      const locked=i>state.unlockedStage;
      const status=locked?'Terkunci':state.completedStages.includes(i)?'Selesai':i===pageStage[state.page]?'Sedang dipelajari':'Terbuka';
      return `<button class="stage-card" data-stage="${i}" ${locked?'disabled':''}>
        <img src="${ASSET.menu}${s.icon}" alt="">
        <span><h3>${s.label}</h3><p>${status}</p></span>
        <img class="state-img" src="${ASSET.progress}${stateIcon(i)}" alt="${status}">
      </button>`;
    }).join('');
  }

  function showMenu(){ renderStageGrid(); menuModal.classList.remove('hidden'); playUiSound('soft'); }
  function hideMenu(){ menuModal.classList.add('hidden'); playUiSound('soft'); }

  function navConfig(){
    let show=true, back=true, next=true, label='Lanjut', disabled=false;
    const p=state.page;
    if(p==='opening'){back=false; label='Mulai';}
    if(p==='identity'){label='Lihat Tujuan';}
    if(p==='objectives'){label='Mulai Ekspedisi';}
    if(p==='roadmap'){label='Pos 1: Jantung';}
    if(p==='heart') disabled=!state.checks.heart;
    if(p==='vessels') disabled=!state.checks.vessels;
    if(p==='circulation') disabled=!state.checks.circulation;
    if(p==='cells') disabled=!state.checks.cells;
    if(p==='disorders'){disabled=!state.checks.disorders; label='Masuk Misi';}
    if(p==='missionsIntro') label='Misi 1';
    if(p==='missionHeart') disabled=!state.mission.heart;
    if(p==='missionVessels') disabled=!state.mission.vessels;
    if(p==='missionCirculation') disabled=!state.mission.circulation;
    if(p==='missionCells') disabled=!state.mission.cells;
    if(p==='missionCases') disabled=!state.mission.cases;
    if(p==='missionSummary') label='Buka Evaluasi';
    if(p==='quizIntro'){ label='Mulai Evaluasi'; if(backendConfigured()) disabled=!String(state.name||'').trim() || !state.className; }
    if(p==='quiz') {label=state.quiz.index===19?'Selesai':'Soal Berikutnya'; disabled=!isQuizAnswered(state.quiz.index);}
    if(p==='result'){show=false;}
    if(p==='game'){label='Selesaikan Ekspedisi';disabled=state.game.score<3;}
    if(p==='finish'){show=false;}
    return {show,back,next,label,disabled};
  }

  function updateNav(){
    const n=navConfig();
    $('#bottomNav').classList.toggle('hidden',!n.show);
    backBtn.classList.toggle('hidden',!n.back);
    nextBtn.classList.toggle('hidden',!n.next);
    nextBtn.querySelector('span').textContent=n.label;
    nextBtn.disabled=n.disabled;
  }

  function nextPage(){
    const p=state.page;
    if(p==='opening') return setPage('identity');
    if(p==='identity'){ unlock(1); completeStage(0); return setPage('objectives'); }
    if(p==='objectives'){ unlock(2); completeStage(1); return setPage('roadmap'); }
    if(p==='roadmap') return setPage('heart');
    if(p==='heart') return setPage('vessels');
    if(p==='vessels') return setPage('circulation');
    if(p==='circulation') return setPage('cells');
    if(p==='cells') return setPage('disorders');
    if(p==='disorders'){ unlock(3); completeStage(2); return setPage('missionsIntro'); }
    if(p==='missionsIntro') return setPage('missionHeart');
    if(p==='missionHeart') return setPage('missionVessels');
    if(p==='missionVessels') return setPage('missionCirculation');
    if(p==='missionCirculation') return setPage('missionCells');
    if(p==='missionCells') return setPage('missionCases');
    if(p==='missionCases') return setPage('missionSummary');
    if(p==='missionSummary'){ unlock(4); completeStage(3); return setPage('quizIntro'); }
    if(p==='quizIntro'){
      if(backendConfigured() && (!String(state.name||'').trim() || !state.className)){ toast('Isi nama dan kelas untuk leaderboard.'); return; }
      if(state.quiz.done) resetQuizForRetry(true); else state.quiz.index=0;
      saveState(); return setPage('quiz');
    }
    if(p==='quiz'){
      saveCurrentQuizAnswer();
      if(state.quiz.index<19){ state.quiz.index++; saveState(); return render(); }
      finishQuiz(); return;
    }
    if(p==='game'){ completeStage(5); return setPage('finish'); }
  }

  function backPage(){
    const p=state.page;
    if(p==='quiz' && state.quiz.index>0){ saveCurrentQuizAnswer(); state.quiz.index--; saveState(); return render(); }
    const i=pageOrder.indexOf(p); if(i>0) setPage(pageOrder[i-1]);
  }

  function render(){
    if(typeof simTimer !== 'undefined' && state.page!=='circulation' && simTimer){ clearInterval(simTimer); simTimer = null; }
    setBackground(); updateTopbar();
    const fn=renderers[state.page] || renderOpening;
    screen.innerHTML=fn();
    bindScreenEvents();
    updateNav();
    screen.scrollTop=0; window.scrollTo({top:0,behavior:'instant'}); screen.focus({preventScroll:true});
  }

  const renderers = {
    opening: renderOpening, identity: renderIdentity, objectives: renderObjectives, roadmap: renderRoadmap,
    heart: renderHeart, vessels: renderVessels, circulation: renderCirculation, cells: renderCells, disorders: renderDisorders,
    missionsIntro: renderMissionsIntro, missionHeart: renderMissionHeart, missionVessels: renderMissionVessels,
    missionCirculation: renderMissionCirculation, missionCells: renderMissionCells, missionCases: renderMissionCases,
    missionSummary: renderMissionSummary, quizIntro: renderQuizIntro, quiz: renderQuiz, result: renderResult, game: renderGame, finish: renderFinish
  };

  function renderOpening(){
    return `<section class="hero">
      <div><div class="kicker">IPA Kelas VIII • Kurikulum Merdeka</div><h1><span>Blood Journey</span><br>Ekspedisi Sistem Transportasi Manusia</h1>
      <p>Ikuti perjalanan darah dari jantung menuju paru-paru dan seluruh tubuh. Pelajari organ, pembuluh, komponen darah, serta gangguan sistem peredaran secara bertahap.</p>
      <div class="hero-badges"><span class="badge">HP Friendly</span><span class="badge red">Akses Bertahap</span><span class="badge gold">5 JP+</span></div></div>
      <div class="hero-media hero-science"><img src="${ASSET.science}heart_overview.webp" alt="Ilustrasi anatomi jantung manusia"><div class="hero-mascot">${mascot('eri_wave.webp','Eri, maskot eritrosit')}</div></div>
    </section>`;
  }

  function renderIdentity(){
    return `<div class="section-title"><div class="kicker">Personalisasi opsional</div><h1>Siapa penjelajah hari ini?</h1></div>
      <section class="card identity-form">
        <div class="field"><label for="nameInput">Nama panggilan</label><input id="nameInput" maxlength="30" value="${esc(state.name)}" placeholder="Contoh: Alya"></div>
        <div class="field"><label for="classInput">Kelas</label><select id="classInput"><option value="">Lewati / tidak diisi</option><option ${state.className==='8A'?'selected':''}>8A</option><option ${state.className==='8B'?'selected':''}>8B</option></select></div>
      </section>`;
  }

  function renderObjectives(){
    const goals=[
      ['1','Kenali pusat transportasi','Mengidentifikasi jantung, pembuluh darah, dan fungsi utamanya.'],
      ['2','Ikuti jalur darah','Menyusun peredaran darah kecil dan besar serta menjelaskan sirkulasi ganda.'],
      ['3','Kenali komponen darah','Membedakan plasma, eritrosit, leukosit, dan trombosit beserta fungsinya.'],
      ['4','Kenali gangguan','Menghubungkan konsep peredaran darah dengan gangguan serta kebiasaan menjaga kesehatan.']
    ];
    return `<div class="section-title"><div class="kicker">Tujuan Pembelajaran</div><h1>Misi Ekspedisi</h1><p>Target evaluasi akhir minimal 75. Checkpoint materi membantu memastikan konsep penting dipahami sebelum lanjut.</p></div>
      <div class="card-grid two">${goals.map(g=>`<article class="card mission-card"><span class="badge gold">Misi ${g[0]}</span><h3>${g[1]}</h3><p>${g[2]}</p></article>`).join('')}</div>`;
  }

  function renderRoadmap(){
    const items=[
      ['heart','Jantung','Pompa utama sistem peredaran.','heart_overview.webp'],['vessels','Pembuluh darah','Arteri, vena, dan kapiler.','vessels_comparison.webp'],
      ['circulation','Sirkulasi ganda','Peredaran kecil dan besar.','double_circulation.webp'],['cells','Komponen darah','Plasma, eritrosit, leukosit, trombosit.','blood_components.webp'],
      ['disorders','Gangguan & kesehatan','Anemia, hipertensi, hemofilia, leukemia, koroner.','quiz_case_anemia.webp']
    ];
    return `<div class="section-title"><div class="kicker">Peta Materi</div><h1>5 Pos Ekspedisi</h1><p>Selesaikan checkpoint setiap pos untuk membuka perjalanan berikutnya.</p></div>
      <div class="roadmap">${items.map((it,i)=>{const done=state.checks[it[0]], current=!done && items.slice(0,i).every(x=>state.checks[x[0]]); const icon=done?'status_done.webp':current?'status_current.webp':'status_locked.webp'; return `<div class="roadmap-item ${!done&&!current?'locked':''}"><img src="${ASSET.science}${it[3]}" alt=""><div><h3>Pos ${i+1} — ${it[1]}</h3><p>${it[2]}</p></div><img class="status" src="${ASSET.progress}${icon}" alt=""></div>`}).join('')}</div>`;
  }

  function renderHeart(){
    return `<div class="section-title"><div class="kicker">Pos 1 • Jantung</div><h1>Pompa utama sistem transportasi</h1><p>Jantung adalah organ berotot berongga yang bekerja sebagai pompa ganda: sisi kanan mengirim darah ke paru-paru, sisi kiri mengirim darah ke seluruh tubuh.</p></div>
      <div class="material-layout"><figure class="figure-card">${sci('heart_four_chambers.webp','Diagram empat ruang jantung')}<figcaption class="figure-caption">Empat ruang jantung: atrium kanan, ventrikel kanan, atrium kiri, dan ventrikel kiri. 🔍 Ketuk gambar untuk memperbesar.</figcaption></figure>
      <div><div class="reveal-grid">${[
        ['Atrium kanan','Menerima darah dari tubuh melalui vena kava.'],['Ventrikel kanan','Memompa darah menuju paru-paru melalui arteri pulmonalis.'],['Atrium kiri','Menerima darah dari paru-paru melalui vena pulmonalis.'],['Ventrikel kiri','Memompa darah menuju seluruh tubuh melalui aorta.']
      ].map(x=>`<button class="reveal-card" data-reveal><strong>${x[0]}</strong><span>Ketuk untuk melihat fungsi</span><span class="answer">${x[1]}</span></button>`).join('')}</div>
      <div class="deep-dive-stack">
        <details class="deep-dive" open><summary>Struktur penting yang perlu dipahami</summary><div class="deep-body"><p><b>Septum</b> memisahkan sisi kanan dan kiri jantung sehingga aliran darah dari kedua sisi tidak bercampur secara langsung. Dinding jantung terutama tersusun oleh otot jantung (miokardium).</p><p><b>Ventrikel kiri berdinding lebih tebal</b> karena harus menghasilkan tekanan lebih besar untuk mengalirkan darah ke seluruh tubuh dibandingkan ventrikel kanan yang memompa ke paru-paru.</p></div></details>
        <details class="deep-dive"><summary>Empat katup dan aliran satu arah</summary><div class="deep-body"><p>Katup <b>trikuspid</b> berada antara atrium kanan–ventrikel kanan; katup <b>pulmonal</b> antara ventrikel kanan–arteri pulmonalis; katup <b>mitral/bikuspid</b> antara atrium kiri–ventrikel kiri; dan katup <b>aorta</b> antara ventrikel kiri–aorta.</p><p>Katup membuka dan menutup mengikuti perbedaan tekanan sehingga membantu mencegah aliran balik.</p></div></details>
        <details class="deep-dive"><summary>Sistol, diastol, dan denyut jantung</summary><div class="deep-body"><p><b>Diastol</b> adalah fase ketika ruang jantung rileks dan terisi darah. <b>Sistol</b> adalah fase ketika ventrikel berkontraksi dan mendorong darah keluar. Pergantian kedua fase inilah yang membentuk siklus jantung.</p></div></details>
        <details class="deep-dive"><summary>Jantung juga membutuhkan suplai darah</summary><div class="deep-body"><p>Otot jantung memperoleh oksigen dan nutrisi melalui <b>pembuluh koroner</b>. Jika aliran pada pembuluh koroner berkurang karena penyempitan atau sumbatan, kerja otot jantung dapat terganggu.</p></div></details>
      </div>
      <div class="source-note">Pendalaman ilmiah: American Heart Association — anatomi ruang dan katup jantung.</div>
      <div class="checkpoint"><h3>Checkpoint</h3><p>Ruang jantung yang memompa darah ke seluruh tubuh adalah …</p><div class="option-grid">${['Atrium kanan','Atrium kiri','Ventrikel kanan','Ventrikel kiri'].map(v=>`<button class="option" data-check="heart" data-value="${v}">${v}</button>`).join('')}</div><div id="heartFeedback" class="feedback"></div></div></div></div>`;
  }
  function renderVessels(){
    return `<div class="section-title"><div class="kicker">Pos 2 • Pembuluh darah</div><h1>Jalan raya bagi darah</h1><p>Pembuluh bukan sekadar pipa. Struktur dinding, tekanan, katup, dan diameter pembuluh menentukan bagaimana darah bergerak dan bertukar zat.</p></div>
      <div class="material-layout"><figure class="figure-card">${sci('vessels_comparison.webp','Perbandingan arteri vena kapiler')}<figcaption class="figure-caption">Arteri membawa darah keluar dari jantung, vena menuju jantung, dan kapiler menjadi tempat pertukaran zat dengan jaringan. 🔍 Ketuk gambar untuk memperbesar tulisan dan detail.</figcaption></figure>
      <div class="fact-list"><div class="fact"><span class="fact-dot"></span><span><b>Arteri:</b> membawa darah menjauhi jantung; dinding otot dan elastis relatif tebal karena menerima tekanan lebih tinggi.</span></div><div class="fact"><span class="fact-dot"></span><span><b>Vena:</b> membawa darah menuju jantung; tekanannya lebih rendah, lumennya relatif besar, dan banyak vena—terutama pada tungkai—memiliki katup.</span></div><div class="fact"><span class="fact-dot"></span><span><b>Kapiler:</b> pembuluh mikroskopis dengan dinding sangat tipis, terutama satu lapis endotel, sehingga pertukaran zat dapat berlangsung efisien.</span></div><div class="science-note">Catatan penting: arteri tidak selalu berarti kaya oksigen. Arteri pulmonalis membawa darah dari jantung menuju paru-paru; vena pulmonalis membawa darah dari paru-paru ke jantung.</div>
      <div class="deep-dive-stack">
        <details class="deep-dive" open><summary>Mengapa struktur arteri dan vena berbeda?</summary><div class="deep-body"><p>Arteri memiliki lapisan otot polos dan jaringan elastis yang lebih kuat untuk menghadapi tekanan dari pompa jantung. Vena membawa darah pada tekanan lebih rendah sehingga dindingnya lebih tipis dan aliran balik dibantu oleh katup serta kontraksi otot rangka.</p></div></details>
        <details class="deep-dive"><summary>Arteriol: pengatur distribusi aliran</summary><div class="deep-body"><p>Cabang arteri yang lebih kecil disebut <b>arteriol</b>. Penyempitan (vasokonstriksi) dan pelebaran (vasodilatasi) arteriol membantu mengatur banyaknya darah yang masuk ke jaringan dan ikut memengaruhi tahanan pembuluh.</p></div></details>
        <details class="deep-dive"><summary>Apa yang terjadi di kapiler?</summary><div class="deep-body"><p>Oksigen dan zat gizi bergerak dari darah menuju jaringan, sedangkan karbon dioksida dan sebagian zat sisa bergerak dari jaringan menuju darah. Pertukaran terjadi melalui difusi serta perpindahan cairan akibat perbedaan tekanan.</p><p>Diameter sebagian kapiler sangat kecil sehingga eritrosit dapat lewat hampir satu per satu.</p></div></details>
        <details class="deep-dive"><summary>Tekanan darah dan nadi</summary><div class="deep-body"><p>Denyut yang terasa sebagai <b>nadi</b> adalah gelombang tekanan pada arteri akibat kontraksi jantung. Tekanan semakin menurun ketika darah bergerak dari arteri besar menuju pembuluh yang lebih kecil dan kembali melalui vena.</p></div></details>
      </div>
      <div class="source-note">Pendalaman ilmiah: OpenStax Anatomy & Physiology — struktur pembuluh dan pertukaran kapiler.</div>
      <div class="checkpoint"><h3>Checkpoint</h3><p>Pembuluh yang membawa darah <b>menuju jantung</b> adalah …</p><div class="option-grid">${['Arteri','Vena','Kapiler'].map(v=>`<button class="option" data-check="vessels" data-value="${v}">${v}</button>`).join('')}</div><div id="vesselFeedback" class="feedback"></div></div></div></div>`;
  }
  function renderCirculation(){
    return `<div class="section-title"><div class="kicker">Pos 3 • Sirkulasi Ganda</div><h1>Dua lintasan yang saling terhubung</h1><p>Manusia memiliki sistem peredaran tertutup dan ganda. Darah selalu mengalir di dalam pembuluh dan dalam satu perjalanan lengkap melewati jantung dua kali.</p></div>
      <figure class="figure-card">${sci('double_circulation.webp','Diagram peredaran darah ganda')}<figcaption class="figure-caption">Jalur pulmonal menghubungkan jantung–paru-paru, sedangkan jalur sistemik menghubungkan jantung–seluruh tubuh. Kode biru/merah hanya penanda visual; darah manusia tidak berwarna biru. 🔍 Ketuk gambar untuk memperbesar.</figcaption></figure>
      <div class="tab-row" style="margin-top:12px"><button class="tab-button active" data-route="small">Peredaran Kecil</button><button class="tab-button" data-route="large">Peredaran Besar</button></div>
      <div class="card" id="routePanel" style="margin-top:10px">${routeHtml('small')}</div>
      <div class="deep-dive-stack">
        <details class="deep-dive" open><summary>Bagaimana pertukaran oksigen terjadi?</summary><div class="deep-body"><p>Di paru-paru, darah melewati kapiler di sekitar alveolus. Oksigen masuk ke darah dan banyak diikat hemoglobin dalam eritrosit, sedangkan karbon dioksida bergerak dari darah menuju alveolus untuk dikeluarkan saat ekspirasi.</p><p>Di jaringan tubuh terjadi kebalikan secara umum: oksigen dilepas untuk sel, sementara karbon dioksida hasil metabolisme masuk ke darah untuk dibawa kembali ke paru-paru.</p></div></details>
        <details class="deep-dive"><summary>Mengapa tekanan kedua lintasan berbeda?</summary><div class="deep-body"><p>Sirkulasi pulmonal menempuh jarak lebih pendek menuju paru-paru sehingga bekerja pada tekanan lebih rendah. Sirkulasi sistemik harus mengirim darah ke jaringan seluruh tubuh, sehingga ventrikel kiri menghasilkan tekanan lebih tinggi.</p></div></details>
      </div>
      <section class="resource-section"><div class="section-mini-title"><span>Simulasi Lokal</span><h2>Laboratorium Aliran Darah</h2><p>Seluruh simulasi kini berjalan langsung di dalam MPI. Pilih mode lintasan, jalankan animasi, lalu amati penjelasan pada setiap perpindahan.</p></div>
        <div id="localSimWrap">${buildLocalSimulationHtml()}</div>
      </section>
      <section class="resource-section"><div class="section-mini-title"><span>Simulasi Konsep</span><h2>Bandingkan pulmonal, sistemik, dan siklus penuh</h2><p>Gunakan mode simulasi berikut untuk melihat perbedaan jalur, tujuan, dan muatan oksigen secara lebih ringkas.</p></div>
        <div id="flowLabWrap">${buildFlowLabHtml()}</div>
      </section>
      <section class="resource-section"><div class="section-mini-title"><span>Video Pendalaman</span><h2>Sistem Peredaran Darah — Part 1 & Part 2</h2><p>Tonton setelah memahami diagram agar konsep visual dan istilah dapat dihubungkan.</p></div>
        <div class="video-grid">
          <article class="video-card"><h3>Part 1</h3><div class="embed-shell video-shell"><iframe src="https://www.youtube-nocookie.com/embed/dxRESjSNKV8" title="Sistem Peredaran Darah Part 1" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><a class="external-link" href="https://www.youtube.com/watch?v=dxRESjSNKV8" target="_blank" rel="noopener noreferrer">Buka Part 1 di YouTube ↗</a></article>
          <article class="video-card"><h3>Part 2</h3><div class="embed-shell video-shell"><iframe src="https://www.youtube-nocookie.com/embed/_66IMzckF2E" title="Sistem Peredaran Darah Part 2" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><a class="external-link" href="https://www.youtube.com/watch?v=_66IMzckF2E" target="_blank" rel="noopener noreferrer">Buka Part 2 di YouTube ↗</a></article>
        </div>
      </section>
      <div class="checkpoint"><h3>Checkpoint</h3><p>Mengapa disebut sistem peredaran darah ganda?</p><div class="option-grid"><button class="option" data-check="circulation" data-value="dua">Dalam satu siklus lengkap, darah melewati jantung dua kali.</button><button class="option" data-check="circulation" data-value="duaorgan">Karena manusia memiliki dua jantung.</button><button class="option" data-check="circulation" data-value="duadarah">Karena ada dua warna darah.</button></div><div id="circulationFeedback" class="feedback"></div></div>`;
  }
  function routeHtml(type){
    if(type==='small') return `<h3>Peredaran darah kecil / pulmonal</h3><p>Ventrikel kanan → arteri pulmonalis → paru-paru → vena pulmonalis → atrium kiri.</p><figure class="figure-card" style="margin-top:10px">${sci('pulmonary_circulation.webp','Jalur peredaran darah kecil')}</figure>`;
    return `<h3>Peredaran darah besar / sistemik</h3><p>Ventrikel kiri → aorta/arteri → jaringan tubuh → vena → vena kava → atrium kanan.</p><figure class="figure-card" style="margin-top:10px">${sci('systemic_circulation.webp','Jalur peredaran darah besar')}</figure>`;
  }

  function renderCells(){
    return `<div class="section-title"><div class="kicker">Pos 4 • Darah</div><h1>Plasma dan unsur berbentuk darah</h1><p>Darah adalah jaringan cair. Sekitar 55% volumenya berupa plasma, sedangkan sekitar 45% lainnya terutama berupa eritrosit dengan leukosit dan trombosit dalam jumlah jauh lebih kecil.</p></div>
      <figure class="figure-card">${sci('blood_components.webp','Komponen darah: plasma, eritrosit, leukosit, trombosit')}<figcaption class="figure-caption">Plasma adalah bagian cair; eritrosit, leukosit, dan trombosit merupakan unsur berbentuk. 🔍 Ketuk gambar untuk memperbesar.</figcaption></figure>
      <div class="blood-composition-card"><div class="blood-bar"><span class="plasma-bar" style="width:55%">Plasma ≈55%</span><span class="formed-bar" style="width:45%">Unsur berbentuk ≈45%</span></div><p class="note">Angka adalah perkiraan umum dan dapat bervariasi antarindividu/kondisi.</p></div>
      <div class="tab-row" style="margin-top:12px"><button class="tab-button active" data-cell="plasma">Plasma</button><button class="tab-button" data-cell="eri">Eritrosit</button><button class="tab-button" data-cell="leo">Leukosit</button><button class="tab-button" data-cell="trom">Trombosit</button></div>
      <div class="card cell-panel" id="cellPanel">${cellHtml('plasma')}</div>
      <div class="deep-dive-stack">
        <details class="deep-dive" open><summary>Plasma bukan sekadar air</summary><div class="deep-body"><p>Plasma berwarna kekuningan pucat dan sekitar <b>90–92% terdiri atas air</b>. Di dalamnya terlarut protein plasma (albumin, globulin, fibrinogen), elektrolit, zat gizi, hormon, gas terlarut, dan zat sisa metabolisme.</p><p>Fungsinya antara lain mengangkut zat terlarut, membantu menjaga volume cairan dan tekanan osmotik, ikut menjaga pH, mendistribusikan panas, serta membawa faktor pembekuan.</p></div></details>
        <details class="deep-dive"><summary>Plasma berbeda dengan serum</summary><div class="deep-body"><p><b>Serum</b> adalah cairan yang tersisa setelah darah membeku. Serum menyerupai plasma, tetapi tidak memiliki fibrinogen dan sebagian besar faktor pembekuan yang telah digunakan pada proses pembekuan.</p></div></details>
        <details class="deep-dive"><summary>Hematokrit dan “buffy coat”</summary><div class="deep-body"><p>Jika darah dipusingkan (sentrifugasi), eritrosit mengendap di bawah. Persentase volume eritrosit disebut <b>hematokrit</b>. Di antara eritrosit dan plasma terdapat lapisan tipis “buffy coat” yang terutama berisi leukosit dan trombosit.</p></div></details>
      </div>
      <div class="source-note">Pendalaman ilmiah: OpenStax & NCBI/StatPearls — komposisi darah dan plasma.</div>
      <div class="checkpoint"><h3>Checkpoint</h3><p>Komponen darah yang terutama berperan dalam pembekuan adalah …</p><div class="option-grid">${['Eritrosit','Leukosit','Trombosit'].map(v=>`<button class="option" data-check="cells" data-value="${v}">${v}</button>`).join('')}</div><div id="cellsFeedback" class="feedback"></div></div>`;
  }
  function cellHtml(id){
    if(id==='plasma') return `<div class="plasma-visual">💧</div><div><h3>Plasma — medium cair darah</h3><p>Bagian cair kekuningan yang membawa sel darah dan berbagai zat terlarut. Plasma membantu transportasi, keseimbangan cairan/pH, distribusi panas, dan pembekuan.</p><ul class="compact-list"><li>≈55% volume darah secara umum</li><li>≈90–92% air</li><li>Mengandung protein, elektrolit, nutrien, hormon, dan zat sisa</li></ul></div>`;
    if(id==='eri') return `${mascot('eri_reading.webp','Eri')}<div><h3>Eritrosit — sel darah merah</h3><p>Bentuk bikonkaf memperluas permukaan dan membantu fleksibilitas saat melewati kapiler sempit. Eritrosit matang manusia tidak berinti dan kaya hemoglobin untuk mengangkut oksigen.</p><img class="cell-science-mini" src="${ASSET.science}erythrocytes.webp" alt="Eritrosit bikonkaf"></div>`;
    if(id==='leo') return `${mascot('leo_shield.webp','Leo')}<div><h3>Leukosit — sel darah putih</h3><p>Leukosit adalah kelompok sel pertahanan dengan beberapa jenis dan fungsi. Secara umum leukosit mengenali, menyerang, atau mengoordinasikan respons terhadap mikroorganisme dan benda asing.</p><img class="cell-science-mini" src="${ASSET.science}leukocyte.webp" alt="Leukosit"></div>`;
    return `${mascot('trom_bandage.webp','Trom')}<div><h3>Trombosit — keping darah</h3><p>Trombosit adalah fragmen sel kecil yang menempel pada lokasi cedera pembuluh, membantu membentuk sumbat awal dan bekerja bersama faktor pembekuan untuk mengurangi kehilangan darah.</p><img class="cell-science-mini" src="${ASSET.science}platelets_scientific.webp" alt="Trombosit di antara eritrosit"></div>`;
  }

  function renderDisorders(){
    const cards=[
      ['Anemia','anemia.webp','Anemia adalah keadaan ketika kapasitas darah membawa oksigen berkurang, misalnya karena hemoglobin atau jumlah eritrosit rendah. Penyebabnya beragam—tidak selalu hanya kekurangan zat besi—sehingga diagnosis perlu pemeriksaan yang tepat.'],
      ['Hipertensi','hypertension.webp','Hipertensi adalah tekanan darah yang menetap tinggi. Kondisi ini sering tidak menimbulkan gejala awal, tetapi dalam jangka panjang dapat meningkatkan beban jantung serta merusak pembuluh dan organ.'],
      ['Hemofilia','hemophilia.webp','Hemofilia adalah gangguan pembekuan yang umumnya diturunkan dan berkaitan dengan kekurangan faktor pembekuan tertentu. Akibatnya perdarahan dapat berlangsung lebih lama.'],
      ['Leukemia','leukemia.webp','Leukemia adalah kanker pada jaringan pembentuk darah yang menyebabkan produksi sel darah abnormal dan dapat mengganggu fungsi sel darah normal.'],
      ['Penyakit jantung koroner','coronary_heart_disease.webp','Penyakit jantung koroner terjadi ketika aliran darah pada arteri koroner berkurang, sering berkaitan dengan penumpukan plak aterosklerosis. Akibatnya suplai oksigen ke otot jantung dapat terganggu.']
    ];
    return `<div class="section-title"><div class="kicker">Pos 5 • Gangguan & Kesehatan</div><h1>Ketika sistem transportasi terganggu</h1><p>Hubungkan gangguan dengan struktur atau fungsi yang terdampak. Materi ini untuk pembelajaran konsep, bukan diagnosis mandiri.</p></div>
      <div class="disease-grid">${cards.map(c=>`<article class="disease-card"><img src="${ASSET.health}${c[1]}" alt="Ilustrasi ${c[0]}"><button data-disease>${c[0]} ▾</button><div class="detail">${c[2]}</div></article>`).join('')}</div>
      <section class="card concept-links" style="margin-top:12px"><h3>Hubungkan dengan konsep yang sudah dipelajari</h3><div class="fact-list"><div class="fact"><span class="fact-dot"></span><span><b>Anemia ↔ eritrosit/hemoglobin:</b> pengangkutan oksigen.</span></div><div class="fact"><span class="fact-dot"></span><span><b>Hemofilia ↔ faktor pembekuan/trombosit:</b> hemostasis.</span></div><div class="fact"><span class="fact-dot"></span><span><b>Hipertensi ↔ pembuluh & tekanan:</b> beban dinding pembuluh dan jantung.</span></div><div class="fact"><span class="fact-dot"></span><span><b>Koroner ↔ suplai otot jantung:</b> aliran darah ke miokardium.</span></div></div></section>
      <div class="card" style="margin-top:12px"><h3>Kebiasaan yang mendukung kesehatan sistem peredaran</h3><p class="note">Kebiasaan sehat membantu menurunkan risiko, tetapi tidak menjamin seseorang bebas penyakit.</p><div class="habit-grid" style="margin-top:10px">${[
        ['Aktivitas fisik sesuai kemampuan',1],['Pola makan bergizi seimbang',1],['Tidak merokok',1],['Istirahat cukup',1],['Merokok',0],['Mengabaikan masalah kesehatan yang sudah didiagnosis',0]
      ].map((h,i)=>`<button class="habit ${h[1]?'':'bad'}" data-habit="${h[1]}" data-hid="${i}">${h[0]}</button>`).join('')}</div><div id="habitFeedback" class="feedback"></div></div>`;
  }
  function renderMissionsIntro(){
    return `<div class="section-title"><div class="kicker">Pembelajaran Bertahap</div><h1>6 Misi Penguatan Konsep</h1><p>Selesaikan misi satu per satu. Kesalahan boleh diperbaiki sebelum lanjut.</p></div>
      <div class="card-grid two">${[
        ['Operasi Jantung','3 pertanyaan ruang jantung'],['Jalur Pembuluh','minimal 3/4 benar'],['Perjalanan ke Paru-paru','susun jalur pulmonal'],['Tim Sel Darah','3 skenario komponen darah'],['Medical Clue','minimal 2/3 kasus'],['Ringkasan Ekspedisi','cek kesiapan evaluasi']
      ].map((x,i)=>`<article class="card mission-card"><span class="badge">Misi ${i+1}</span><h3>${x[0]}</h3><p>${x[1]}</p></article>`).join('')}</div>`;
  }

  function renderMissionHeart(){
    const qs=[['Ruang yang menerima darah dari tubuh?','Atrium kanan'],['Ruang yang memompa darah ke paru-paru?','Ventrikel kanan'],['Ruang yang memompa darah ke seluruh tubuh?','Ventrikel kiri']];
    return missionMcqPage('Misi 1 — Operasi Jantung','Jawab 3/3 dengan benar untuk lanjut.','heart',qs,['Atrium kanan','Atrium kiri','Ventrikel kanan','Ventrikel kiri'],3,'missionHeart');
  }
  function renderMissionVessels(){
    const qs=[['Membawa darah keluar dari jantung','Arteri'],['Membawa darah menuju jantung','Vena'],['Tempat pertukaran zat dengan jaringan','Kapiler'],['Banyak memiliki katup untuk membantu aliran kembali','Vena']];
    return missionMcqPage('Misi 2 — Jalur Pembuluh','Minimal 3 dari 4 benar.','vessels',qs,['Arteri','Vena','Kapiler'],3,'missionVessels');
  }
  function missionMcqPage(title,sub,key,qs,choices,min,formId){
    return `<div class="section-title"><div class="kicker">Misi Bertahap</div><h1>${title}</h1><p>${sub}</p></div><section class="card"><form id="${formId}">${qs.map((q,i)=>`<div style="margin-bottom:14px"><b>${i+1}. ${q[0]}</b><div class="option-grid" style="margin-top:7px">${choices.map(c=>`<label class="answer-option"><input type="radio" name="q${i}" value="${c}"><span>${c}</span></label>`).join('')}</div></div>`).join('')}<button class="primary-action" type="submit">Periksa Misi</button><div id="missionFeedback" class="feedback"></div></form></section>`;
  }

  const pulmonaryOrder=['Ventrikel kanan','Arteri pulmonalis','Paru-paru','Vena pulmonalis','Atrium kiri'];
  const systemicOrder=['Ventrikel kiri','Aorta / arteri','Jaringan tubuh','Vena kava','Atrium kanan'];

  const simSteps = [
    {short:'1', title:'Ventrikel kanan', text:'Perjalanan dimulai ketika ventrikel kanan berkontraksi dan mendorong darah yang miskin oksigen keluar dari jantung.', dir:'right', x:55, y:28, route:'pulmonary'},
    {short:'2', title:'Arteri pulmonalis', text:'Darah bergerak melalui arteri pulmonalis menuju paru-paru. Ini adalah arteri yang membawa darah miskin oksigen.', dir:'up', x:61, y:24, route:'pulmonary'},
    {short:'3', title:'Kapiler paru-paru', text:'Di kapiler sekitar alveolus, darah melepaskan karbon dioksida dan mengambil oksigen dari udara di paru-paru.', dir:'left', x:68, y:18, route:'pulmonary'},
    {short:'4', title:'Vena pulmonalis', text:'Setelah kaya oksigen, darah kembali ke jantung melalui vena pulmonalis.', dir:'left', x:46, y:21, route:'pulmonary'},
    {short:'5', title:'Atrium kiri', text:'Darah kaya oksigen masuk ke atrium kiri sebagai ruang penerima dari paru-paru.', dir:'down', x:49, y:26, route:'pulmonary'},
    {short:'6', title:'Ventrikel kiri', text:'Darah diteruskan ke ventrikel kiri yang berdinding lebih tebal karena harus memompa ke seluruh tubuh.', dir:'down', x:50, y:31, route:'systemic'},
    {short:'7', title:'Aorta', text:'Ventrikel kiri memompa darah ke aorta, arteri besar yang menyalurkan darah ke seluruh tubuh.', dir:'down', x:54, y:39, route:'systemic'},
    {short:'8', title:'Arteri ke organ tubuh', text:'Darah kaya oksigen mengalir melalui arteri menuju organ-organ, otot, otak, ginjal, dan jaringan lain.', dir:'right', x:68, y:52, route:'systemic'},
    {short:'9', title:'Kapiler jaringan', text:'Di kapiler jaringan, oksigen dan nutrien berpindah ke sel, sedangkan karbon dioksida serta zat sisa masuk ke darah.', dir:'left', x:72, y:68, route:'systemic'},
    {short:'10', title:'Vena kava', text:'Darah yang kini miskin oksigen kembali melalui vena-vena besar dan bermuara ke vena kava untuk masuk lagi ke atrium kanan.', dir:'up', x:46, y:42, route:'systemic'}
  ];
  const simModeMap = { full:[0,1,2,3,4,5,6,7,8,9], pulmonary:[0,1,2,3,4], systemic:[5,6,7,8,9] };
  const simModeLabel = { full:'Siklus penuh', pulmonary:'Pulmonal', systemic:'Sistemik' };

  const gamePulmonarySteps = [
    {
      prompt:'MISI: Bawa Eri menuju paru-paru! Eri berada di ventrikel kanan. Pilih jalur berikutnya.',
      choices:['Arteri pulmonalis','Aorta','Vena kava'],
      correct:'Arteri pulmonalis',
      explain:'Hebat! Arteri pulmonalis membawa darah dari ventrikel kanan menuju paru-paru.',
      wrong:{
        'Aorta':'Ups! Aorta menuju sirkulasi tubuh. Cari pembuluh yang membawa darah dari ventrikel kanan ke paru-paru.',
        'Vena kava':'Ups! Vena kava membawa darah kembali ke jantung, bukan dari ventrikel kanan ke paru-paru.'
      }
    },
    {
      prompt:'Eri sudah sampai di paru-paru. Apa yang harus diambil Eri di alveolus?',
      choices:['Oksigen (O₂)','Karbon dioksida (CO₂)','Trombosit'],
      correct:'Oksigen (O₂)',
      explain:'Tepat! Di paru-paru, Eri mengambil oksigen (O₂) dan melepaskan karbon dioksida (CO₂).',
      wrong:{
        'Karbon dioksida (CO₂)':'Belum tepat. Di paru-paru, darah justru melepaskan CO₂ dan mengambil O₂.',
        'Trombosit':'Belum tepat. Trombosit berperan dalam pembekuan, sedangkan Eri mengambil O₂ di paru-paru.'
      }
    },
    {
      prompt:'Sekarang Eri kaya oksigen. Ke ruang jantung mana Eri kembali melalui vena pulmonalis?',
      choices:['Atrium kiri','Atrium kanan','Ventrikel kanan'],
      correct:'Atrium kiri',
      explain:'Benar! Darah kaya oksigen dari paru-paru masuk ke atrium kiri.',
      wrong:{
        'Atrium kanan':'Belum tepat. Atrium kanan menerima darah miskin oksigen dari tubuh.',
        'Ventrikel kanan':'Belum tepat. Dari paru-paru, darah masuk dulu ke atrium kiri, baru kemudian ke ventrikel kiri.'
      }
    }
  ];

  const gameSystemicSteps = [
    {
      prompt:'MISI: Antar O₂ ke seluruh tubuh! Setelah dari paru-paru, Eri yang sudah membawa O₂ masuk ke ruang jantung mana?',
      choices:['Atrium kiri','Atrium kanan','Ventrikel kanan'],
      correct:'Atrium kiri',
      explain:'Benar! Eri yang kaya O₂ kembali ke atrium kiri.',
      wrong:{
        'Atrium kanan':'Ups! Atrium kanan menerima darah miskin oksigen dari seluruh tubuh.',
        'Ventrikel kanan':'Belum tepat. Dari paru-paru, darah masuk dulu ke atrium kiri.'
      }
    },
    {
      prompt:'Dari atrium kiri, ke mana Eri bergerak agar dapat dipompa kuat ke seluruh tubuh?',
      choices:['Ventrikel kiri','Ventrikel kanan','Atrium kanan'],
      correct:'Ventrikel kiri',
      explain:'Tepat! Ventrikel kiri memompa darah ke seluruh tubuh dengan tekanan paling kuat.',
      wrong:{
        'Ventrikel kanan':'Belum tepat. Ventrikel kanan memompa darah ke paru-paru.',
        'Atrium kanan':'Belum tepat. Atrium kanan adalah ruang penerima darah dari tubuh.'
      }
    },
    {
      prompt:'Pembuluh besar apa yang dipakai Eri untuk keluar dari ventrikel kiri?',
      choices:['Aorta','Arteri pulmonalis','Vena pulmonalis'],
      correct:'Aorta',
      explain:'Benar! Aorta adalah arteri terbesar yang menyalurkan darah ke seluruh tubuh.',
      wrong:{
        'Arteri pulmonalis':'Belum tepat. Arteri pulmonalis membawa darah dari ventrikel kanan ke paru-paru.',
        'Vena pulmonalis':'Belum tepat. Vena pulmonalis justru membawa darah dari paru-paru ke atrium kiri.'
      }
    },
    {
      prompt:'Tujuan akhir misi ini adalah mengantarkan O₂ ke ...',
      choices:['Jaringan tubuh','Paru-paru','Atrium kanan'],
      correct:'Jaringan tubuh',
      explain:'Ya! Oksigen dibawa eritrosit menuju sel dan jaringan tubuh.',
      wrong:{
        'Paru-paru':'Belum tepat. Eri baru saja mengambil O₂ dari paru-paru, sekarang tugasnya mengantar ke jaringan.',
        'Atrium kanan':'Belum tepat. Atrium kanan menerima darah miskin oksigen setelah darah kembali dari tubuh.'
      }
    }
  ];

  const gameCellSteps = [
    {
      prompt:'🦠 Bakteri masuk! Siapa yang kamu panggil?',
      choices:['Eri','Leo','Trom'],
      correct:'Leo',
      explain:'Tepat! Leo mewakili leukosit yang membantu melawan patogen.',
      wrong:{
        'Eri':'Belum tepat. Eri bertugas mengangkut oksigen, bukan melawan patogen.',
        'Trom':'Belum tepat. Trom membantu pembekuan darah, bukan pertahanan utama terhadap bakteri.'
      },
      scene:'bacteria'
    },
    {
      prompt:'🩹 Pembuluh terluka! Siapa yang bertugas datang ke area luka?',
      choices:['Eri','Leo','Trom'],
      correct:'Trom',
      explain:'Benar! Trom mewakili trombosit yang membantu membentuk sumbat awal pembekuan.',
      wrong:{
        'Eri':'Belum tepat. Eri mengangkut oksigen, bukan membekukan darah.',
        'Leo':'Belum tepat. Leukosit bertahan melawan patogen, sedangkan pembekuan dibantu trombosit.'
      },
      scene:'injury'
    },
    {
      prompt:'💪 Sel otot membutuhkan oksigen! Siapa yang kamu kirim?',
      choices:['Eri','Leo','Trom'],
      correct:'Eri',
      explain:'Ya! Eri mewakili eritrosit yang membawa oksigen menggunakan hemoglobin.',
      wrong:{
        'Leo':'Belum tepat. Leo bertugas untuk pertahanan tubuh.',
        'Trom':'Belum tepat. Trom bertugas pada pembekuan darah, bukan pengangkutan oksigen.'
      },
      scene:'oxygen'
    }
  ];

  function getGameRoundConfig(kind){
    return {
      pulmonary:{
        title:'Ronde 1 — Misi Eri ke Paru-paru',
        subtitle:'Visual: jantung → pilihan jalur → paru-paru',
        tag:'Misi Pulmonal',
        accent:'blue',
        avatar:'eri_run.webp',
        type:'route',
        steps:gamePulmonarySteps,
        progress:state.game.pRound,
        done:state.game.pulmonary,
        feedback:state.game.feedback.pulmonary,
        log:state.game.logP,
        startPos:1,
        route:[
          {icon:'🫀',label:'Jantung'},
          {icon:'',label:'Ventrikel kanan'},
          {icon:'',label:'Arteri pulmonalis'},
          {icon:'🫁',label:'Paru-paru'},
          {icon:'',label:'Atrium kiri'}
        ]
      },
      systemic:{
        title:'Ronde 2 — Antar O₂ ke Seluruh Tubuh',
        subtitle:'Eri mengambil O₂ di paru-paru lalu mengantarkannya ke jaringan tubuh.',
        tag:'Misi Sistemik',
        accent:'red',
        avatar:'eri_success.webp',
        type:'route',
        steps:gameSystemicSteps,
        progress:state.game.sRound,
        done:state.game.systemic,
        feedback:state.game.feedback.systemic,
        log:state.game.logS,
        startPos:0,
        route:[
          {icon:'🫁',label:'Paru-paru + O₂'},
          {icon:'',label:'Atrium kiri'},
          {icon:'',label:'Ventrikel kiri'},
          {icon:'',label:'Aorta'},
          {icon:'📍',label:'Jaringan tubuh'}
        ]
      },
      cells:{
        title:'Ronde 3 — Tim Penolong Darah',
        subtitle:'Pilih tokoh yang tepat untuk setiap situasi.',
        tag:'Situational Game',
        accent:'gold',
        avatar:'leo_teacher.webp',
        type:'situational',
        steps:gameCellSteps,
        progress:state.game.cRound,
        done:state.game.cells,
        feedback:state.game.feedback.cells,
        log:state.game.logC
      }
    }[kind];
  }

  function mascotForChoice(name){
    return ({Eri:'eri_run.webp',Leo:'leo_shield.webp',Trom:'trom_bandage.webp'})[name] || 'eri_wave.webp';
  }
  function orderBuilderHtml(pool,built,key){
    return `<div class="order-pool">${pool.filter(x=>!built.includes(x)).map(x=>`<button class="order-chip" data-order-key="${key}" data-order-value="${x}">${x}</button>`).join('')}</div><div class="order-built">${built.map((x,i)=>`<button class="order-chip" data-order-remove="${key}" data-order-index="${i}">${i+1}. ${x}</button>`).join('')}</div><button class="ghost-action" data-order-reset="${key}" style="margin-top:8px">Reset urutan</button>`;
  }
  function renderMissionCirculation(){
    const shuffled=['Paru-paru','Vena pulmonalis','Ventrikel kanan','Atrium kiri','Arteri pulmonalis'];
    return `<div class="section-title"><div class="kicker">Misi Bertahap</div><h1>Misi 3 — Perjalanan ke Paru-paru</h1><p>Ketuk kartu sesuai urutan perjalanan darah kecil.</p></div><section class="card"><div id="missionOrderArea">${orderBuilderHtml(shuffled,state.temp.missionOrder,'mission')}</div><div class="action-row"><button class="primary-action" data-check-order="mission">Periksa Urutan</button></div><div id="missionOrderFeedback" class="feedback"></div></section>`;
  }
  function renderMissionCells(){
    const qs=[['Tubuh membutuhkan pengangkutan oksigen.','Eritrosit'],['Mikroorganisme masuk ke tubuh.','Leukosit'],['Terjadi luka pada kulit.','Trombosit']];
    return missionMcqPage('Misi 4 — Tim Sel Darah','Jawab 3/3 dengan benar.','cells',qs,['Eritrosit','Leukosit','Trombosit'],3,'missionCells');
  }
  function renderMissionCases(){
    const qs=[['Kadar hemoglobin rendah dan mudah lelah. Komponen yang paling berkaitan?','Eritrosit'],['Luka sulit membeku. Komponen yang paling terkait?','Trombosit'],['Pertahanan terhadap mikroorganisme terutama melibatkan?','Leukosit']];
    return missionMcqPage('Misi 5 — Medical Clue','Minimal 2 dari 3 benar.','cases',qs,['Eritrosit','Leukosit','Trombosit'],2,'missionCases');
  }
  function renderMissionSummary(){
    const items=[['Jantung',state.mission.heart],['Pembuluh darah',state.mission.vessels],['Peredaran ganda',state.mission.circulation],['Komponen darah',state.mission.cells],['Kasus sederhana',state.mission.cases]];
    return `<div class="section-title"><div class="kicker">Ringkasan Ekspedisi</div><h1>Siap mengikuti evaluasi?</h1><p>Semua misi penguatan telah selesai.</p></div><section class="card">${items.map(x=>`<div class="fact"><img src="${ASSET.progress}${x[1]?'status_done.webp':'status_locked.webp'}" alt="" style="width:32px;height:32px"><span><b>${x[0]}</b><br>${x[1]?'Selesai':'Belum selesai'}</span></div>`).join('')}</section>`;
  }

  const quiz = [
    {id:'q01',section:'Dasar',type:'mcq',icon:'quiz_mcq.webp',q:'Ruang jantung yang memompa darah menuju seluruh tubuh adalah …',opts:['Atrium kanan','Atrium kiri','Ventrikel kanan','Ventrikel kiri'],a:'Ventrikel kiri',ex:'Ventrikel kiri memompa darah menuju sirkulasi sistemik melalui aorta.'},
    {id:'q02',section:'Dasar',type:'tf',icon:'quiz_truefalse.webp',q:'Semua arteri membawa darah yang kaya oksigen.',opts:['Benar','Salah'],a:'Salah',ex:'Arteri ditentukan oleh arah aliran keluar dari jantung. Arteri pulmonalis membawa darah menuju paru-paru.'},
    {id:'q03',section:'Dasar',type:'match',icon:'quiz_match.webp',q:'Pasangkan jenis pembuluh dengan fungsi yang tepat.',a:{Arteri:'Keluar dari jantung',Vena:'Menuju jantung',Kapiler:'Pertukaran zat'},ex:'Arteri keluar dari jantung, vena menuju jantung, kapiler menjadi tempat pertukaran zat.'},
    {id:'q04',section:'Dasar',type:'sequence',icon:'quiz_sequence.webp',q:'Urutkan jalur peredaran darah kecil.',items:['Paru-paru','Atrium kiri','Ventrikel kanan','Arteri pulmonalis','Vena pulmonalis'],a:pulmonaryOrder,ex:pulmonaryOrder.join(' → ')},
    {id:'q05',section:'Dasar',type:'short',icon:'quiz_short.webp',q:'Protein pada eritrosit yang membantu mengikat oksigen disebut …',a:['hemoglobin','hb'],ex:'Hemoglobin (Hb) adalah protein utama pada eritrosit yang mengikat oksigen.'},
    {id:'q06',section:'Dasar',type:'mcq',icon:'quiz_mcq.webp',q:'Komponen darah yang terutama berperan dalam pembekuan darah adalah …',opts:['Eritrosit','Leukosit','Trombosit','Plasma saja'],a:'Trombosit',ex:'Trombosit berperan penting dalam proses pembekuan darah.'},
    {id:'q07',section:'Dasar',type:'match',icon:'quiz_match.webp',q:'Pasangkan komponen darah dengan fungsi utamanya.',a:{Plasma:'Transportasi zat terlarut & keseimbangan cairan',Eritrosit:'Transportasi oksigen',Leukosit:'Pertahanan tubuh',Trombosit:'Pembekuan darah'},ex:'Plasma membawa berbagai zat terlarut dan membantu keseimbangan cairan; eritrosit mengangkut oksigen; leukosit berperan dalam pertahanan; trombosit membantu pembekuan.'},
    {id:'q08',section:'Dasar',type:'mcq',icon:'quiz_mcq.webp',q:'Siswa memiliki kadar hemoglobin rendah dan mudah lelah. Komponen yang paling berkaitan dengan transportasi oksigen adalah …',opts:['Eritrosit','Leukosit','Trombosit','Katup jantung'],a:'Eritrosit',ex:'Eritrosit mengandung hemoglobin yang berperan penting dalam transportasi oksigen.'},
    {id:'q09',section:'Dasar',type:'multi',icon:'quiz_multiselect.webp',q:'Pilih semua kebiasaan yang mendukung kesehatan sistem peredaran darah.',opts:['Aktivitas fisik sesuai kemampuan','Merokok','Pola makan bergizi seimbang','Istirahat cukup','Mengabaikan tekanan darah tinggi yang telah didiagnosis'],a:['Aktivitas fisik sesuai kemampuan','Pola makan bergizi seimbang','Istirahat cukup'],ex:'Aktivitas fisik, pola makan seimbang, dan istirahat cukup mendukung kesehatan; merokok dan mengabaikan kondisi yang telah didiagnosis tidak.'},
    {id:'q10',section:'Dasar',type:'sequence',icon:'quiz_sequence.webp',q:'Urutkan jalur utama peredaran darah besar.',items:['Atrium kanan','Jaringan tubuh','Ventrikel kiri','Vena kava','Aorta / arteri'],a:systemicOrder,ex:systemicOrder.join(' → ')},

    {id:'q11',section:'HOTS',type:'mcq',icon:'quiz_mcq.webp',q:'Katup mitral tidak menutup sempurna saat ventrikel kiri berkontraksi. Dampak yang paling logis adalah …',opts:['Sebagian darah mengalir kembali ke atrium kiri sehingga aliran maju ke aorta dapat berkurang','Darah langsung berpindah dari ventrikel kanan ke ventrikel kiri','Semua darah berhenti masuk ke paru-paru','Trombosit berubah menjadi eritrosit'],a:'Sebagian darah mengalir kembali ke atrium kiri sehingga aliran maju ke aorta dapat berkurang',ex:'Katup mitral berada antara atrium kiri dan ventrikel kiri. Jika tidak menutup baik, sebagian darah dapat mengalir balik saat sistol.'},
    {id:'q12',section:'HOTS',type:'mcq',icon:'quiz_mcq.webp',q:'Seorang siswa mengalami dehidrasi sehingga volume plasma menurun, tetapi jumlah eritrositnya belum berubah. Secara relatif, hematokrit cenderung …',opts:['Meningkat karena proporsi eritrosit terhadap volume darah menjadi lebih besar','Menurun menjadi nol','Tidak mungkin berubah dalam kondisi apa pun','Sama dengan jumlah leukosit'],a:'Meningkat karena proporsi eritrosit terhadap volume darah menjadi lebih besar',ex:'Jika volume plasma berkurang sementara massa eritrosit relatif tetap, persentase volume yang ditempati eritrosit dapat meningkat.'},
    {id:'q13',section:'HOTS',type:'mcq',icon:'quiz_mcq.webp',q:'Jika aliran pada arteri pulmonalis tersumbat berat, perubahan awal yang paling langsung terjadi adalah …',opts:['Lebih sedikit darah mencapai paru-paru untuk pertukaran gas','Lebih banyak darah langsung mencapai aorta','Kapiler tubuh berubah menjadi vena','Hemoglobin berhenti diproduksi oleh plasma'],a:'Lebih sedikit darah mencapai paru-paru untuk pertukaran gas',ex:'Arteri pulmonalis membawa darah dari ventrikel kanan menuju paru-paru. Hambatan pada jalur ini mengurangi darah yang mencapai kapiler paru.'},
    {id:'q14',section:'HOTS',type:'mcq',icon:'quiz_mcq.webp',q:'Setelah berlari, denyut jantung meningkat. Penjelasan yang paling sesuai dengan fungsi sistem transportasi adalah …',opts:['Jantung meningkatkan aliran darah agar kebutuhan oksigen jaringan dan pembuangan karbon dioksida dapat dipenuhi lebih cepat','Jantung berhenti mengirim darah ke otot','Trombosit berubah menjadi leukosit agar tubuh lebih kuat','Plasma tidak lagi diperlukan saat aktivitas fisik'],a:'Jantung meningkatkan aliran darah agar kebutuhan oksigen jaringan dan pembuangan karbon dioksida dapat dipenuhi lebih cepat',ex:'Saat aktivitas meningkat, jaringan membutuhkan lebih banyak oksigen dan menghasilkan lebih banyak karbon dioksida, sehingga curah jantung meningkat.'},
    {id:'q15',section:'HOTS',type:'mcq',icon:'quiz_mcq.webp',q:'Hasil pemeriksaan menunjukkan eritrosit dan leukosit dalam kisaran normal tetapi trombosit sangat rendah. Masalah yang paling mungkin berkaitan langsung adalah …',opts:['Perdarahan lebih sulit berhenti setelah terjadi luka','Kemampuan mengikat oksigen selalu meningkat','Tubuh tidak memiliki plasma','Arteri tidak dapat membawa darah keluar dari jantung'],a:'Perdarahan lebih sulit berhenti setelah terjadi luka',ex:'Trombosit berperan penting pada pembentukan sumbat awal dan proses pembekuan darah.'},

    {id:'q16',section:'PISA-style',type:'mcq',icon:'quiz_mcq.webp',stimulus:'<div class="stimulus-card"><strong>Data denyut nadi seorang siswa</strong><table><tr><th>Kondisi</th><th>Denyut/menit</th></tr><tr><td>Sebelum berlari</td><td>76</td></tr><tr><td>Segera setelah berlari</td><td>142</td></tr><tr><td>5 menit setelah berlari</td><td>88</td></tr></table></div>',q:'Kesimpulan yang paling didukung oleh data adalah …',opts:['Denyut meningkat saat kebutuhan tubuh naik lalu mendekati kondisi awal selama pemulihan','Denyut selalu tetap berapa pun aktivitasnya','Setelah aktivitas, denyut harus selalu lebih rendah daripada sebelum aktivitas','Data membuktikan bahwa kapiler berubah menjadi arteri'],a:'Denyut meningkat saat kebutuhan tubuh naik lalu mendekati kondisi awal selama pemulihan',ex:'Data menunjukkan kenaikan tajam setelah aktivitas dan penurunan kembali selama masa pemulihan.'},
    {id:'q17',section:'PISA-style',type:'mcq',icon:'quiz_mcq.webp',stimulus:'<div class="stimulus-card"><strong>Dua sampel darah</strong><table><tr><th>Sampel</th><th>O₂ relatif</th><th>CO₂ relatif</th></tr><tr><td>A</td><td>Rendah</td><td>Tinggi</td></tr><tr><td>B</td><td>Tinggi</td><td>Rendah</td></tr></table></div>',q:'Jika kedua sampel diambil dari pembuluh yang terhubung langsung dengan paru-paru, sampel B paling sesuai dengan darah pada …',opts:['Vena pulmonalis','Arteri pulmonalis','Vena kava','Arteri menuju kaki sebelum pertukaran jaringan'],a:'Vena pulmonalis',ex:'Setelah pertukaran gas di paru-paru, darah yang kembali melalui vena pulmonalis memiliki oksigen lebih tinggi dan karbon dioksida lebih rendah.'},
    {id:'q18',section:'PISA-style',type:'mcq',icon:'quiz_mcq.webp',stimulus:'<div class="stimulus-card"><strong>Pemisahan komponen darah</strong><p>Secara umum sekitar 55% volume darah adalah plasma.</p></div>',q:'Jika sampel darah berjumlah 500 mL, perkiraan volume plasma yang paling mendekati adalah …',opts:['275 mL','55 mL','225 mL','500 mL'],a:'275 mL',ex:'55% × 500 mL = 275 mL. Nilai 55% adalah perkiraan umum dan dapat bervariasi.'},
    {id:'q19',section:'PISA-style',type:'sequence',icon:'quiz_sequence.webp',stimulus:'<div class="stimulus-card"><strong>Pelacak aliran darah</strong><p>Sebuah zat pelacak hipotetis dimasukkan ke vena di lengan dan diikuti sampai menuju paru-paru.</p></div>',q:'Urutkan struktur utama yang dilalui zat pelacak setelah masuk ke vena besar menuju jantung.',items:['Arteri pulmonalis','Ventrikel kanan','Atrium kanan','Vena kava','Paru-paru'],a:['Vena kava','Atrium kanan','Ventrikel kanan','Arteri pulmonalis','Paru-paru'],ex:'Darah dari vena tubuh kembali melalui vena kava → atrium kanan → ventrikel kanan → arteri pulmonalis → paru-paru.'},
    {id:'q20',section:'PISA-style',type:'mcq',icon:'quiz_mcq.webp',stimulus:'<div class="stimulus-card"><strong>Data tiga pembuluh</strong><table><tr><th>Pembuluh</th><th>Ketebalan dinding</th><th>Fungsi dominan</th></tr><tr><td>X</td><td>Tebal & elastis</td><td>Menerima tekanan tinggi</td></tr><tr><td>Y</td><td>Lebih tipis, ada katup</td><td>Mengembalikan darah</td></tr><tr><td>Z</td><td>Sangat tipis, satu lapis sel</td><td>Pertukaran zat</td></tr></table></div>',q:'Pembuluh Z paling mungkin adalah …',opts:['Kapiler','Arteri besar','Vena besar','Aorta'],a:'Kapiler',ex:'Kapiler berdinding sangat tipis sehingga mendukung pertukaran gas, nutrien, dan zat sisa dengan jaringan.'}
  ];

  function renderQuizIntro(){
    const online=backendConfigured();
    return `<div class="section-title"><div class="kicker">Evaluasi Akhir</div><h1>Ujian Penjelajah</h1><p>20 soal: 10 konsep dasar, 5 HOTS, dan 5 soal literasi sains bergaya PISA. Feedback jawaban ditampilkan setelah seluruh evaluasi selesai.</p></div>
      <section class="card"><div class="fact-list"><div class="fact"><span class="fact-dot"></span><span>Satu soal per layar.</span></div><div class="fact"><span class="fact-dot"></span><span>Setiap soal bernilai 5 poin; total nilai 100.</span></div><div class="fact"><span class="fact-dot"></span><span>Nilai 75 atau lebih termasuk kategori tuntas.</span></div><div class="fact"><span class="fact-dot"></span><span>Jika nilai kurang dari 75, siswa dapat mengulang evaluasi.</span></div></div></section>
      <section class="card evaluation-identity" style="margin-top:12px"><h3>${online?'Identitas untuk leaderboard':'Identitas sesi'}</h3><p>${online?'Nama dan kelas diperlukan agar hasil dapat direkap di Google Sheet guru dan masuk leaderboard.':'Google Apps Script belum dikonfigurasi; evaluasi tetap berjalan secara lokal.'}</p><div class="field-grid"><div class="field"><label for="quizNameInput">Nama</label><input id="quizNameInput" maxlength="60" value="${esc(state.name)}" placeholder="Nama siswa"></div><div class="field"><label for="quizClassInput">Kelas</label><select id="quizClassInput"><option value="">Pilih kelas</option><option ${state.className==='8A'?'selected':''}>8A</option><option ${state.className==='8B'?'selected':''}>8B</option></select></div></div>${online?'<div class="science-note">Hasil evaluasi akan dikirim ke Google Sheet melalui Apps Script saat evaluasi selesai.</div>':'<div class="science-note">Hasil belum dikirim ke Google Sheet sampai URL Apps Script dikonfigurasi.</div>'}</section>`;
  }

  function renderQuiz(){
    const q=quiz[state.quiz.index], ans=state.quiz.answers[state.quiz.index];
    return `<div class="quiz-shell"><div class="quiz-meta"><div class="quiz-type"><img src="${ASSET.quiz}${q.icon}" alt=""><span>${quizTypeLabel(q.type)} • ${q.section}</span></div><span class="badge">Soal ${state.quiz.index+1}/20</span></div><section class="question-card">${q.stimulus||''}<h2>${q.q}</h2>${renderQuizControl(q,ans,state.quiz.index)}<div class="quiz-save">Jawaban disimpan selama sesi • Percobaan ${state.quiz.attempt||1}</div></section></div>`;
  }
  function quizTypeLabel(t){ return ({mcq:'Pilihan Ganda',tf:'Benar/Salah',match:'Menjodohkan',sequence:'Mengurutkan',short:'Isian Singkat',multi:'Multi-select'})[t]||'Soal'; }
  function renderQuizControl(q,ans,idx){
    if(['mcq','tf'].includes(q.type)) return q.opts.map(o=>`<label class="answer-option"><input type="radio" name="quizAnswer" value="${o}" ${ans===o?'checked':''}><span>${o}</span></label>`).join('');
    if(q.type==='multi'){ const arr=Array.isArray(ans)?ans:[]; return q.opts.map(o=>`<label class="answer-option"><input type="checkbox" name="quizMulti" value="${o}" ${arr.includes(o)?'checked':''}><span>${o}</span></label>`).join(''); }
    if(q.type==='short') return `<input class="short-answer" id="quizShort" value="${esc(ans||'')}" placeholder="Ketik jawaban">`;
    if(q.type==='match'){ const opts=[...new Set(Object.values(q.a))]; const obj=ans||{}; return Object.keys(q.a).map(k=>`<div class="match-row"><b>${k}</b><select data-match="${k}"><option value="">Pilih fungsi</option>${opts.map(o=>`<option ${obj[k]===o?'selected':''}>${o}</option>`).join('')}</select></div>`).join(''); }
    if(q.type==='sequence'){
      const built=Array.isArray(ans)?ans:[]; return orderBuilderHtml(q.items,built,`quiz${idx}`);
    }
    return '';
  }
  function isQuizAnswered(idx){
    const q=quiz[idx], a=state.quiz.answers[idx];
    if(q.type==='multi') return Array.isArray(a)&&a.length>0;
    if(q.type==='match') return a && Object.keys(q.a).every(k=>a[k]);
    if(q.type==='sequence') return Array.isArray(a)&&a.length===q.a.length;
    return !!String(a||'').trim();
  }
  function saveCurrentQuizAnswer(){
    const idx=state.quiz.index, q=quiz[idx];
    if(q.type==='mcq'||q.type==='tf'){ const el=$('input[name="quizAnswer"]:checked'); if(el) state.quiz.answers[idx]=el.value; }
    if(q.type==='multi') state.quiz.answers[idx]=$$('input[name="quizMulti"]:checked').map(x=>x.value);
    if(q.type==='short'){ const el=$('#quizShort'); if(el) state.quiz.answers[idx]=el.value.trim(); }
    if(q.type==='match'){ const obj={}; $$('[data-match]').forEach(s=>obj[s.dataset.match]=s.value); state.quiz.answers[idx]=obj; }
    saveState();
  }
  function answerCorrect(q,a){
    if(q.type==='match') return Object.keys(q.a).every(k=>a?.[k]===q.a[k]);
    if(q.type==='sequence') return Array.isArray(a)&&a.length===q.a.length&&a.every((v,i)=>v===q.a[i]);
    if(q.type==='multi'){ const x=[...(a||[])].sort(), y=[...q.a].sort(); return JSON.stringify(x)===JSON.stringify(y); }
    if(q.type==='short') return q.a.includes(String(a||'').trim().toLowerCase());
    return a===q.a;
  }
  function resetQuizForRetry(increment=true){
    const nextAttempt=(state.quiz.attempt||1)+(increment?1:0);
    state.quiz={index:0,answers:{},done:false,score:0,correctCount:0,attempt:nextAttempt,syncStatus:'local',resultId:null};
    saveState();
  }

  function evaluationBreakdown(){
    const breakdown={Dasar:{correct:0,total:0},HOTS:{correct:0,total:0},'PISA-style':{correct:0,total:0}};
    quiz.forEach((q,i)=>{
      const section=breakdown[q.section] || (breakdown[q.section]={correct:0,total:0});
      section.total++;
      if(answerCorrect(q,state.quiz.answers[i])) section.correct++;
    });
    return breakdown;
  }

  function evaluationPayload(){
    const score=Number(state.quiz.score||0);
    const answers={}; quiz.forEach((q,i)=>answers[q.id]=state.quiz.answers[i] ?? null);
    return {
      student_name:String(state.name||'').trim(),
      class_name:state.className,
      answers,
      score,
      category:score>=86?'Sangat Baik':score>=75?'Tuntas':'Perlu Penguatan',
      correct_count:Number(state.quiz.correctCount||0),
      total_questions:20,
      attempt_number:state.quiz.attempt||1,
      breakdown:evaluationBreakdown()
    };
  }

  async function syncEvaluationResult(){
    if(!backendConfigured()){ state.quiz.syncStatus='local'; saveState(); return; }
    if(!String(state.name||'').trim() || !state.className){ state.quiz.syncStatus='failed'; saveState(); if(state.page==='result') render(); return; }
    state.quiz.syncStatus='sending'; saveState(); if(state.page==='result') render();
    try{
      const result=await window.BloodBackend.submitEvaluation(evaluationPayload());
      if(result?.configured){
        state.quiz.syncStatus='synced';
      }
    }catch(err){
      console.error('Gagal mengirim hasil evaluasi:',err);
      state.quiz.syncStatus='failed';
    }
    saveState(); if(state.page==='result') render();
  }

  function finishQuiz(){
    saveCurrentQuizAnswer(); let correct=0; quiz.forEach((q,i)=>{if(answerCorrect(q,state.quiz.answers[i])) correct++;});
    state.quiz.score=correct*5; state.quiz.correctCount=correct; state.quiz.done=true; state.quiz.syncStatus=backendConfigured()?'sending':'local'; unlock(5); completeStage(4); saveState(); playUiSound('complete'); setPage('result');
    void syncEvaluationResult();
  }

  function syncStatusHtml(){
    if(!backendConfigured()) return '<div class="sync-status local">Mode lokal • Google Apps Script belum dikonfigurasi</div>';
    if(state.quiz.syncStatus==='sending') return '<div class="sync-status sending">⏳ Mengirim hasil ke Google Sheet…</div>';
    if(state.quiz.syncStatus==='synced') return '<div class="sync-status synced">✓ Hasil telah dikirim ke Google Sheet dan akan masuk leaderboard</div>';
    if(state.quiz.syncStatus==='failed') return '<div class="sync-status failed">⚠ Hasil belum berhasil dikirim ke Google Sheet</div>';
    return '<div class="sync-status local">Hasil tersimpan di sesi ini</div>';
  }

  function renderResult(){
    const score=Number(state.quiz.score||0), correct=Number(state.quiz.correctCount||0); const cat=score>=86?'Sangat Baik':score>=75?'Tuntas':'Perlu Penguatan'; const cls=score>=86?'good':score>=75?'ok':'retry';
    return `<div class="section-title"><div class="kicker">Hasil Evaluasi • Percobaan ${state.quiz.attempt||1}</div><h1>${state.name?`Hasil ${esc(state.name)}`:'Hasil Ekspedisi'}</h1><p>${backendConfigured()?'Hasil dikirim ke Google Sheet guru melalui Apps Script.':'Hasil saat ini tersimpan lokal karena Google Apps Script belum dikonfigurasi.'}</p></div>
      <section class="score-card"><div class="score-number">${score}</div><div class="score-label ${cls}">${cat}</div><p>${correct} jawaban benar dari 20 soal.</p>${syncStatusHtml()}</section>
      <div class="review-list">${quiz.map((q,i)=>`<details class="review-item"><summary>Soal ${i+1} • ${q.section} — ${answerCorrect(q,state.quiz.answers[i])?'✓ Benar':'✕ Tinjau lagi'}</summary><p><b>Pembahasan:</b> ${q.ex}</p></details>`).join('')}</div>
      <div class="action-row">${score<75?'<button class="primary-action" data-action="retryQuiz">Ulangi Evaluasi</button>':''}<button class="secondary-action" data-action="reviewMaterial">Ulangi Materi</button><button class="secondary-action" data-action="leaderboard">Lihat Leaderboard</button>${state.quiz.syncStatus==='failed'?'<button class="secondary-action" data-action="resubmitResult">Kirim Ulang Hasil</button>':''}<button class="primary-action" data-action="toGame">Lanjut ke Game</button></div>`;
  }

  function renderGame(){
    return `<div class="section-title"><div class="kicker">Simulasi / Games</div><h1>Misi Sel Darah</h1><p>Eri, Leo, dan Trom sekarang benar-benar beraksi dalam gameplay. Pilih jalur, bantu animasi misi, dan kumpulkan bintang.</p></div>
      <div class="stars">${[1,2,3].map(i=>i<=state.game.score?'⭐':'☆').join('')}</div>
      <div class="game-overview card"><div class="game-legend"><span class="chip">Ronde 1: Eri ke paru-paru</span><span class="chip">Ronde 2: Antar O₂ ke tubuh</span><span class="chip">Ronde 3: Situasi khusus</span></div><p class="note">Setiap ronde berisi misi singkat. Pilihan yang tepat akan menggerakkan karakter dan memberi penguatan konsep. Selesaikan 3 bintang untuk membuka tombol <b>Selesaikan Ekspedisi</b>.</p></div>
      ${renderMissionGameCard('pulmonary')}
      ${renderMissionGameCard('systemic')}
      ${renderMissionGameCard('cells')}`;
  }

  function renderMissionGameCard(kind){
    const cfg = getGameRoundConfig(kind);
    const step = cfg.steps[Math.min(cfg.progress, cfg.steps.length-1)];
    const badgeClass = cfg.accent==='gold' ? 'gold' : (cfg.accent==='red' ? 'red' : '');
    return `<section class="game-round story ${cfg.accent}">
      <div class="game-head"><div><span class="badge ${badgeClass}">${cfg.tag}</span><h3>${cfg.title}</h3><p>${cfg.subtitle}</p></div><img class="game-mascot" src="${ASSET.mascots}${cfg.avatar}" alt="${cfg.title}"></div>
      <div class="game-progress-line">${cfg.steps.map((_,i)=>`<span class="${i<cfg.progress || cfg.done?'done':i===cfg.progress?'current':''}">${i+1}</span>`).join('')}</div>
      ${cfg.type==='route' ? renderRouteMission(kind,cfg,step) : renderSituationalMission(cfg,step)}
    </section>`;
  }

  function renderRouteMission(kind,cfg,step){
    const pos = Math.min(cfg.route.length-1, (cfg.startPos||0) + cfg.progress);
    const hasOxygen = kind==='systemic' || (kind==='pulmonary' && cfg.progress>=2) || cfg.done;
    if(cfg.done){
      return `<div class="route-board">${routeBoardHtml(cfg.route,pos,hasOxygen)}</div><div class="game-dialog success"><strong>Misi selesai!</strong><p>${cfg.log.join(' ')}</p></div><div class="action-row"><button class="secondary-action" data-game-restart="${kind}">Ulangi ronde ini</button></div>`;
    }
    return `<div class="route-board">${routeBoardHtml(cfg.route,pos,hasOxygen)}</div>
      <div class="game-dialog"><strong>Langkah ${cfg.progress+1}/${cfg.steps.length}</strong><p>${step.prompt}</p></div>
      <div class="option-grid game-choice-grid">${step.choices.map(choice=>`<button class="option" data-game-choice="${kind}" data-choice="${choice}">${choice}</button>`).join('')}</div>
      <div class="feedback ${feedbackTone(cfg.feedback)}">${cfg.feedback || 'Pilih jalur atau konsep yang paling tepat agar Eri bisa melanjutkan misinya.'}</div>`;
  }

  function renderSituationalMission(cfg,step){
    if(cfg.done){
      return `<div class="situation-stage done"><div class="situation-scene"><div class="scene-icon">⭐</div><div><h4>Semua situasi terselesaikan!</h4><p>Eri, Leo, dan Trom sudah menunjukkan fungsi utamanya.</p></div></div><div class="responder-grid"><div class="responder-token">${mascot('leo_shield.webp','Leo')}</div><div class="responder-token">${mascot('trom_bandage.webp','Trom')}</div><div class="responder-token">${mascot('eri_success.webp','Eri')}</div></div></div><div class="game-dialog success"><strong>Misi selesai!</strong><p>${cfg.log.join(' ')}</p></div><div class="action-row"><button class="secondary-action" data-game-restart="cells">Ulangi ronde ini</button></div>`;
    }
    const sceneMeta = {
      bacteria:{icon:'🦠', title:'Patogen terdeteksi', helper:'Pertahanan tubuh perlu diaktifkan.'},
      injury:{icon:'🩹', title:'Pembuluh darah terluka', helper:'Tubuh harus mencegah perdarahan berlanjut.'},
      oxygen:{icon:'🫁', title:'Jaringan membutuhkan oksigen', helper:'Kirim pembawa oksigen yang tepat.'}
    }[step.scene] || {icon:'❓',title:'Situasi',helper:''};
    return `<div class="situation-stage"><div class="situation-scene"><div class="scene-icon">${sceneMeta.icon}</div><div><h4>${sceneMeta.title}</h4><p>${sceneMeta.helper}</p></div></div><div class="responder-grid">${['Eri','Leo','Trom'].map(name=>`<div class="responder-token ${name===step.correct?'target-hint':''}">${mascot(mascotForChoice(name),name)}<span>${name}</span></div>`).join('')}</div></div>
      <div class="game-dialog"><strong>Langkah ${cfg.progress+1}/${cfg.steps.length}</strong><p>${step.prompt}</p></div>
      <div class="option-grid game-choice-grid">${step.choices.map(choice=>`<button class="option" data-game-choice="cells" data-choice="${choice}">${choice}</button>`).join('')}</div>
      <div class="feedback ${feedbackTone(cfg.feedback)}">${cfg.feedback || 'Pilih karakter yang paling sesuai dengan situasi.'}</div>`;
  }

  function routeBoardHtml(route,pos,hasOxygen){
    return `<div class="route-track">${route.map((node,i)=>`<div class="route-node ${i<pos?'done':''} ${i===pos?'current':''}"><div class="node-badge">${node.icon || i+1}</div><div class="node-label">${node.label}</div>${i===pos?`<div class="route-eri"><img src="${ASSET.mascots}eri_run.webp" alt="Eri bergerak">${hasOxygen?'<span class="o2-badge">O₂</span>':''}</div>`:''}</div>${i<route.length-1?'<div class="route-link"></div>':''}` ).join('')}</div>`;
  }

  function feedbackTone(text=''){
    if(!text) return '';
    return /^(Tepat|Benar|Hebat|Ya)/.test(text) ? 'good' : 'bad';
  }

  function renderFinish(){
    return `<section class="hero finish-hero"><div><div class="kicker">Ekspedisi Selesai</div><h1>Hebat, ${esc(state.name||'Penjelajah')}!</h1><p>Kamu telah mengikuti perjalanan darah dari jantung, paru-paru, seluruh tubuh, hingga kembali ke jantung.</p><div class="action-row"><button class="secondary-action" data-action="reviewMaterial">Pelajari Lagi</button><button class="primary-action" data-action="replayGame">Mainkan Lagi</button></div></div><div class="mascot-trio">${mascot('eri_success.webp','Eri')}${mascot('leo_teacher.webp','Leo')}${mascot('trom_clot.webp','Trom')}</div></section>`;
  }


  let zoomLevel=1;
  function openImageZoom(img){
    const modal=$('#imageZoomModal'), zimg=$('#zoomImage'), caption=$('#zoomCaption');
    if(!modal||!zimg) return;
    zoomLevel=1;
    zimg.src=img.currentSrc||img.src;
    zimg.alt=img.alt||'Gambar materi diperbesar';
    const fig=img.closest('figure');
    caption.textContent=fig?.querySelector('figcaption')?.textContent?.replace('🔍 Ketuk gambar untuk memperbesar.','').trim() || img.alt || '';
    applyZoom();
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }
  function applyZoom(){ const zimg=$('#zoomImage'); if(zimg) zimg.style.width=`${Math.round(zoomLevel*100)}%`; const zl=$('#zoomLevel'); if(zl) zl.textContent=`${Math.round(zoomLevel*100)}%`; }
  function closeImageZoom(){ $('#imageZoomModal')?.classList.add('hidden'); document.body.classList.remove('modal-open'); }
  function changeZoom(delta){ zoomLevel=Math.min(3,Math.max(.75,zoomLevel+delta)); applyZoom(); }

  function bindScreenEvents(){
    $$('[data-reveal]').forEach(b=>b.addEventListener('click',()=>b.classList.toggle('open')));
    $$('[data-disease]').forEach(b=>b.addEventListener('click',()=>b.closest('.disease-card').classList.toggle('open')));
    $('#nameInput')?.addEventListener('input',e=>{state.name=e.target.value;saveState();updateTopbar();});
    $('#classInput')?.addEventListener('change',e=>{state.className=e.target.value;saveState();});
    $('#quizNameInput')?.addEventListener('input',e=>{state.name=e.target.value;saveState();updateTopbar();updateNav();});
    $('#quizClassInput')?.addEventListener('change',e=>{state.className=e.target.value;saveState();updateNav();});

    $$('[data-check]').forEach(b=>b.addEventListener('click',()=>handleCheckpoint(b)));
    $$('[data-route]').forEach(b=>b.addEventListener('click',()=>{$$('[data-route]').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#routePanel').innerHTML=routeHtml(b.dataset.route);}));
    $$('[data-cell]').forEach(b=>b.addEventListener('click',()=>{$$('[data-cell]').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#cellPanel').innerHTML=cellHtml(b.dataset.cell);}));
    $$('[data-habit]').forEach(b=>b.addEventListener('click',()=>{b.classList.toggle('selected');checkHabits();}));

    $('#missionHeart')?.addEventListener('submit',e=>handleMissionForm(e,'heart',["Atrium kanan","Ventrikel kanan","Ventrikel kiri"],3));
    $('#missionVessels')?.addEventListener('submit',e=>handleMissionForm(e,'vessels',["Arteri","Vena","Kapiler","Vena"],3));
    $('#missionCells')?.addEventListener('submit',e=>handleMissionForm(e,'cells',["Eritrosit","Leukosit","Trombosit"],3));
    $('#missionCases')?.addEventListener('submit',e=>handleMissionForm(e,'cases',["Eritrosit","Trombosit","Leukosit"],2));

    $$('[data-order-key]').forEach(b=>b.addEventListener('click',()=>addOrder(b.dataset.orderKey,b.dataset.orderValue)));
    $$('[data-order-remove]').forEach(b=>b.addEventListener('click',()=>removeOrder(b.dataset.orderRemove,Number(b.dataset.orderIndex))));
    $$('[data-order-reset]').forEach(b=>b.addEventListener('click',()=>resetOrder(b.dataset.orderReset)));
    $$('[data-check-order]').forEach(b=>b.addEventListener('click',()=>checkMissionOrder()));

    $$('input[name="quizAnswer"],input[name="quizMulti"],#quizShort,[data-match]').forEach(el=>el.addEventListener('change',()=>{saveCurrentQuizAnswer();updateNav();}));
    $('#quizShort')?.addEventListener('input',()=>{saveCurrentQuizAnswer();updateNav();});

    $$('[data-action]').forEach(b=>b.addEventListener('click',()=>handleAction(b.dataset.action)));
    $$('[data-game-choice]').forEach(b=>b.addEventListener('click',()=>handleGameChoice(b.dataset.gameChoice,b.dataset.choice)));
    $$('[data-game-restart]').forEach(b=>b.addEventListener('click',()=>restartGameRound(b.dataset.gameRestart)));
    $$('[data-sim-nav]').forEach(b=>b.addEventListener('click',()=>stepSimulation(Number(b.dataset.simNav))));
    $('#simPlayBtn')?.addEventListener('click',toggleSimulationAutoplay);
  }

  function handleCheckpoint(btn){
    const key=btn.dataset.check,val=btn.dataset.value;
    const answers={heart:'Ventrikel kiri',vessels:'Vena',circulation:'dua',cells:'Trombosit'};
    const ok=val===answers[key];
    btn.classList.add(ok?'correct':'wrong');
    const id={heart:'heartFeedback',vessels:'vesselFeedback',circulation:'circulationFeedback',cells:'cellsFeedback'}[key];
    const fb=$(`#${id}`); if(fb){fb.textContent=ok?'Tepat! Checkpoint selesai.':'Belum tepat. Coba perhatikan kembali konsep di atas.';fb.className=`feedback ${ok?'good':'bad'}`;}
    playUiSound(ok?'success':'error');
    if(ok){state.checks[key]=true; saveState(); updateNav();}
  }

  function checkHabits(){
    const selected=$$('[data-habit].selected'); const good=selected.filter(x=>x.dataset.habit==='1').length; const bad=selected.filter(x=>x.dataset.habit==='0').length;
    const fb=$('#habitFeedback');
    if(good>=4 && bad===0){state.checks.disorders=true;saveState();fb.textContent='Tepat. Empat kebiasaan mendukung kesehatan sistem peredaran.';fb.className='feedback good';updateNav();}
    else {fb.textContent='Pilih semua kebiasaan sehat dan hindari kebiasaan yang merugikan.';fb.className='feedback bad';}
  }

  function handleMissionForm(e,key,answers,min){
    e.preventDefault(); let score=0; answers.forEach((a,i)=>{const x=e.currentTarget.querySelector(`input[name="q${i}"]:checked`); if(x?.value===a) score++;});
    state.missionScores[key]=score; state.mission[key]=score>=min; saveState();
    const fb=$('#missionFeedback'); fb.textContent=state.mission[key]?`Misi selesai: ${score}/${answers.length} benar.`:`Skor ${score}/${answers.length}. Perbaiki jawaban dan coba lagi.`;fb.className=`feedback ${state.mission[key]?'good':'bad'}`;updateNav();
  }

  function orderArray(key){
    if(key==='mission') return state.temp.missionOrder;
    if(key==='gameP') return state.temp.gamePulmonary;
    if(key==='gameS') return state.temp.gameSystemic;
    if(key.startsWith('quiz')){const idx=Number(key.replace('quiz','')); if(!Array.isArray(state.quiz.answers[idx])) state.quiz.answers[idx]=[]; return state.quiz.answers[idx];}
    return [];
  }
  function addOrder(key,val){ const arr=orderArray(key); if(!arr.includes(val)) arr.push(val); saveState(); render(); }
  function removeOrder(key,index){ const arr=orderArray(key); arr.splice(index,1); saveState(); render(); }
  function resetOrder(key){ const arr=orderArray(key); arr.length=0; saveState(); render(); }
  function checkMissionOrder(){ const ok=state.temp.missionOrder.length===pulmonaryOrder.length && state.temp.missionOrder.every((v,i)=>v===pulmonaryOrder[i]); state.mission.circulation=ok; saveState(); const fb=$('#missionOrderFeedback'); fb.textContent=ok?'Urutan tepat. Misi selesai!':'Urutan belum tepat. Reset dan coba lagi.';fb.className=`feedback ${ok?'good':'bad'}`;updateNav(); }

  let simTimer = null;

  function getSimIndices(){
    const mode = state.sim.mode || 'full';
    return simModeMap[mode] || simModeMap.full;
  }
  function getCurrentSimStep(){
    const indices = getSimIndices();
    const pos = Math.max(0, Math.min(state.sim.step, indices.length-1));
    const realIndex = indices[pos];
    return { step: simSteps[realIndex], pos, total: indices.length, indices };
  }

  function buildLocalSimulationHtml(){
    const current = getCurrentSimStep();
    const step = current.step;
    return `<div class="card sim2d-card">
      <div class="sim2d-stage">
        <img src="${ASSET.science}circulation_body_map.webp" alt="Diagram 2D anatomi jantung dan pembuluh darah utama manusia">
        <div class="sim-pulse" style="left:${step.x}%; top:${step.y}%"></div>
        <div class="sim-arrow dir-${step.dir}" style="left:${step.x}%; top:${step.y}%">➜</div>
        <div class="sim-label" style="left:${Math.min(74, step.x + 4)}%; top:${Math.max(6, step.y - 4)}%">${step.short}</div>
      </div>
      <div class="sim2d-panel">
        <div class="sim-toolbar"><div class="sim-step-badge">${simModeLabel[state.sim.mode || 'full']} • Langkah ${current.pos+1}/${current.total}</div><button class="ghost-action mini-toggle" id="simResetBtn">Reset</button></div>
        <div class="sim-mode-tabs">${['full','pulmonary','systemic'].map(m=>`<button class="sim-mode-btn ${((state.sim.mode||'full')===m)?'active':''}" data-sim-mode="${m}">${simModeLabel[m]}</button>`).join('')}</div>
        <h3>${step.title}</h3>
        <p>${step.text}</p>
        <div class="sim-track">${current.indices.map((realIndex,i)=>`<span class="sim-dot ${i===current.pos?'current':i<current.pos?'done':''}">${simSteps[realIndex].short}</span>`).join('')}</div>
        <div class="action-row sim-buttons">
          <button class="secondary-action" data-sim-nav="-1">Sebelumnya</button>
          <button class="primary-action" id="simPlayBtn">${simTimer ? 'Jeda' : 'Putar Otomatis'}</button>
          <button class="secondary-action" data-sim-nav="1">Langkah Berikutnya</button>
        </div>
        <div class="science-note">Setiap perpindahan anak panah menandai lokasi aliran darah yang sedang dijelaskan. Mode pulmonal hanya menyorot jalur jantung–paru-paru, sedangkan mode sistemik menyorot jalur jantung–tubuh.</div>
      </div>
    </div>`;
  }

  function buildFlowLabHtml(){
    const configs = {
      pulmonary:{title:'Pulmonal', route:'Ventrikel kanan → arteri pulmonalis → paru-paru → vena pulmonalis → atrium kiri', summary:'Berfungsi untuk pertukaran gas di paru-paru.', color:'blue'},
      systemic:{title:'Sistemik', route:'Ventrikel kiri → aorta/arteri → jaringan tubuh → vena → vena kava → atrium kanan', summary:'Berfungsi menyalurkan oksigen dan nutrien ke seluruh tubuh.', color:'red'},
      full:{title:'Siklus penuh', route:'Menggabungkan lintasan pulmonal dan sistemik dalam satu siklus utuh.', summary:'Menunjukkan mengapa sistem transportasi manusia disebut sirkulasi ganda.', color:'gold'}
    };
    const mode = state.sim.mode || 'full';
    const info = configs[mode];
    return `<div class="card flowlab-card ${info.color}"><div class="flowlab-head"><div><span class="badge ${info.color==='red'?'red':info.color==='gold'?'gold':''}">Mode aktif: ${info.title}</span><h3>Panel Ringkas Simulasi</h3><p>${info.summary}</p></div><img src="${ASSET.mascots}${mode==='pulmonary'?'eri_run.webp':mode==='systemic'?'eri_success.webp':'leo_teacher.webp'}" alt="Maskot simulasi"></div><div class="flowlab-route">${info.route}</div><div class="flowlab-pills">${['full','pulmonary','systemic'].map(m=>`<button class="flowlab-pill ${(mode===m)?'active':''}" data-sim-mode="${m}">${simModeLabel[m]}</button>`).join('')}</div><div class="science-note">Tips: gunakan tombol mode di atas atau pada panel simulasi utama. Keduanya saling terhubung.</div></div>`;
  }

  function refreshLocalSimulation(){
    const wrap = $('#localSimWrap');
    if(wrap){ wrap.innerHTML = buildLocalSimulationHtml(); }
    const lab = $('#flowLabWrap');
    if(lab){ lab.innerHTML = buildFlowLabHtml(); }
    bindLocalSimulationEvents();
  }
  function bindLocalSimulationEvents(){
    $$('[data-sim-nav]').forEach(b=>b.addEventListener('click',()=>stepSimulation(Number(b.dataset.simNav))));
    $$('[data-sim-mode]').forEach(b=>b.addEventListener('click',()=>changeSimulationMode(b.dataset.simMode)));
    $('#simPlayBtn')?.addEventListener('click',toggleSimulationAutoplay);
    $('#simResetBtn')?.addEventListener('click',resetSimulation);
  }
  function changeSimulationMode(mode){
    state.sim.mode = mode;
    state.sim.step = 0;
    saveState();
    playUiSound('soft');
    refreshLocalSimulation();
  }
  function resetSimulation(){
    state.sim.step = 0;
    saveState();
    playUiSound('soft');
    refreshLocalSimulation();
  }
  function stepSimulation(delta){
    const indices = getSimIndices();
    state.sim.step = (state.sim.step + delta + indices.length) % indices.length;
    saveState();
    playUiSound('tick');
    refreshLocalSimulation();
  }
  function toggleSimulationAutoplay(){
    if(simTimer){ clearInterval(simTimer); simTimer = null; playUiSound('soft'); refreshLocalSimulation(); return; }
    simTimer = setInterval(()=>{
      const indices = getSimIndices();
      state.sim.step = (state.sim.step + 1) % indices.length;
      saveState();
      refreshLocalSimulation();
    }, 2400);
    playUiSound('soft');
    refreshLocalSimulation();
  }

  function handleGameChoice(kind, choice){
    const cfg = kind==='pulmonary'
      ? {steps:gamePulmonarySteps, idx:'pRound', done:'pulmonary', fb:'pulmonary', log:'logP'}
      : kind==='systemic'
      ? {steps:gameSystemicSteps, idx:'sRound', done:'systemic', fb:'systemic', log:'logS'}
      : {steps:gameCellSteps, idx:'cRound', done:'cells', fb:'cells', log:'logC'};
    const stepIndex = state.game[cfg.idx];
    const step = cfg.steps[stepIndex];
    if(!step) return;
    if(choice === step.correct){
      state.game.feedback[cfg.fb] = step.explain;
      state.game[cfg.log].push(step.explain);
      state.game[cfg.idx]++;
      if(state.game[cfg.idx] >= cfg.steps.length){
        state.game[cfg.done] = true;
        playUiSound('success');
        toast('Ronde selesai! ⭐');
      }else{
        playUiSound('success');
        toast('Eri maju ke langkah berikutnya!');
      }
    } else {
      state.game.feedback[cfg.fb] = (step.wrong && step.wrong[choice]) ? step.wrong[choice] : 'Belum tepat. Coba lagi.';
      playUiSound('error');
    }
    calcGameScore();
    saveState();
    render();
  }

  function restartGameRound(kind){
    if(kind==='pulmonary'){ state.game.pRound=0; state.game.pulmonary=false; state.game.feedback.pulmonary=''; state.game.logP=[]; }
    if(kind==='systemic'){ state.game.sRound=0; state.game.systemic=false; state.game.feedback.systemic=''; state.game.logS=[]; }
    if(kind==='cells'){ state.game.cRound=0; state.game.cells=false; state.game.feedback.cells=''; state.game.logC=[]; }
    calcGameScore(); saveState(); render();
  }

  function calcGameScore(){ state.game.score=[state.game.pulmonary,state.game.systemic,state.game.cells].filter(Boolean).length; }

  let audioCtx = null;
  function ensureAudio(){
    if(!state.soundOn) return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return null;
    if(!audioCtx) audioCtx = new Ctx();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function playTone(freq=440,dur=.09,type='sine',gain=.025,delay=0){
    const ctx = ensureAudio();
    if(!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + dur);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + delay);
    o.stop(ctx.currentTime + delay + dur + 0.03);
  }
  function playUiSound(type='soft'){
    if(!state.soundOn) return;
    if(type==='soft'){ playTone(660,.05,'sine',.02); }
    if(type==='tick'){ playTone(520,.04,'triangle',.018); }
    if(type==='success'){ playTone(523,.07,'triangle',.026); playTone(659,.08,'triangle',.024,.06); playTone(784,.1,'triangle',.024,.12); }
    if(type==='error'){ playTone(330,.08,'sawtooth',.018); playTone(247,.12,'sawtooth',.016,.06); }
    if(type==='complete'){ playTone(523,.06,'triangle',.024); playTone(659,.06,'triangle',.024,.06); playTone(784,.06,'triangle',.024,.12); playTone(1047,.12,'triangle',.022,.18); }
  }
  function ensureBgmPlaying(){
    if(!bgmAudio || !state.soundOn) return;
    bgmAudio.volume=.13;
    if(bgmAudio.paused) bgmAudio.play().catch(()=>{});
  }
  function pauseBgm(){ if(bgmAudio && !bgmAudio.paused) bgmAudio.pause(); }
  function toggleSound(){
    state.soundOn = !state.soundOn;
    saveState();
    updateTopbar();
    if(state.soundOn){ ensureBgmPlaying(); playUiSound('soft'); } else pauseBgm();
    toast(state.soundOn ? 'Musik dan efek suara diaktifkan' : 'Musik dan efek suara dimatikan');
  }

  function handleAction(a){
    if(a==='reviewMaterial') setPage('roadmap');
    if(a==='toGame') setPage('game');
    if(a==='leaderboard') window.BloodBackend?.openLeaderboard?.();
    if(a==='retryQuiz'){ resetQuizForRetry(true); setPage('quizIntro'); }
    if(a==='resubmitResult') void syncEvaluationResult();
    if(a==='replayGame'){state.game=freshGame();saveState();setPage('game');}
  }

  menuBtn.addEventListener('click',showMenu); closeMenuBtn.addEventListener('click',hideMenu); menuModal.addEventListener('click',e=>{if(e.target===menuModal)hideMenu();});
  soundToggleBtn?.addEventListener('click',toggleSound);
  document.addEventListener('pointerdown',()=>ensureBgmPlaying(),{once:true});
  stageGrid.addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(!b)return;const i=Number(b.dataset.stage);if(i>state.unlockedStage)return;hideMenu();setPage(stages[i].page);});
  nextBtn.addEventListener('click',()=>{ if(state.page==='quiz') saveCurrentQuizAnswer(); playUiSound('tick'); nextPage(); });
  backBtn.addEventListener('click',()=>{ playUiSound('tick'); backPage(); });
  resetBtn.addEventListener('click',()=>{if(confirm('Mulai ulang seluruh progres sesi?')){sessionStorage.removeItem('bloodJourneyV25');state=defaultState();render();}});


  screen.addEventListener('click',e=>{
    const img=e.target.closest('.figure-card img,.cell-science-mini,.disease-card img');
    if(img){ e.preventDefault(); openImageZoom(img); }
  });
  $('#zoomCloseBtn')?.addEventListener('click',closeImageZoom);
  $('#zoomInBtn')?.addEventListener('click',()=>changeZoom(.25));
  $('#zoomOutBtn')?.addEventListener('click',()=>changeZoom(-.25));
  $('#zoomResetBtn')?.addEventListener('click',()=>{zoomLevel=1;applyZoom();});
  $('#imageZoomModal')?.addEventListener('click',e=>{if(e.target.id==='imageZoomModal')closeImageZoom();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeImageZoom();});

  render();
})();
