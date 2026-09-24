/**
 * Blood Journey — Google Sheets + Apps Script backend
 * Bind this script to the Google Sheet that will store student results.
 *
 * Deployment model:
 * - Students: public Web App endpoint (Execute as: Me, Who has access: Anyone)
 * - Teacher: manage results directly in the private Google Sheet using the custom menu.
 *
 * Security model:
 * - Public endpoint only accepts student result submissions and exposes a sanitized leaderboard.
 * - Raw student data is NOT exposed through doGet.
 * - Teacher deletion/recap actions run from the private Google Sheet UI, not from the public MPI.
 */

const BJ = Object.freeze({
  RESULTS_SHEET: 'Hasil',
  RECAP_SHEET: 'Rekap',
  LEADERBOARD_SHEET: 'Leaderboard',
  MAX_LEADERBOARD: 50,
  VALID_CLASSES: ['8A', '8B'],
  HEADERS: [
    'Timestamp',
    'Student Key',
    'Nama',
    'Kelas',
    'Nilai',
    'Kategori',
    'Benar',
    'Total Soal',
    'Percobaan',
    'Dasar Benar',
    'Dasar Total',
    'HOTS Benar',
    'HOTS Total',
    'PISA Benar',
    'PISA Total',
    'Breakdown JSON'
  ]
});

const QUIZ_SPECS = Object.freeze({
  q01:{section:'Dasar',type:'scalar',answer:'Ventrikel kiri'},
  q02:{section:'Dasar',type:'scalar',answer:'Salah'},
  q03:{section:'Dasar',type:'object',answer:{Arteri:'Keluar dari jantung',Vena:'Menuju jantung',Kapiler:'Pertukaran zat'}},
  q04:{section:'Dasar',type:'array',answer:['Ventrikel kanan','Arteri pulmonalis','Paru-paru','Vena pulmonalis','Atrium kiri']},
  q05:{section:'Dasar',type:'short',answer:['hemoglobin','hb']},
  q06:{section:'Dasar',type:'scalar',answer:'Trombosit'},
  q07:{section:'Dasar',type:'object',answer:{Plasma:'Transportasi zat terlarut & keseimbangan cairan',Eritrosit:'Transportasi oksigen',Leukosit:'Pertahanan tubuh',Trombosit:'Pembekuan darah'}},
  q08:{section:'Dasar',type:'scalar',answer:'Eritrosit'},
  q09:{section:'Dasar',type:'set',answer:['Aktivitas fisik sesuai kemampuan','Pola makan bergizi seimbang','Istirahat cukup']},
  q10:{section:'Dasar',type:'array',answer:['Ventrikel kiri','Aorta / arteri','Jaringan tubuh','Vena kava','Atrium kanan']},
  q11:{section:'HOTS',type:'scalar',answer:'Sebagian darah mengalir kembali ke atrium kiri sehingga aliran maju ke aorta dapat berkurang'},
  q12:{section:'HOTS',type:'scalar',answer:'Meningkat karena proporsi eritrosit terhadap volume darah menjadi lebih besar'},
  q13:{section:'HOTS',type:'scalar',answer:'Lebih sedikit darah mencapai paru-paru untuk pertukaran gas'},
  q14:{section:'HOTS',type:'scalar',answer:'Jantung meningkatkan aliran darah agar kebutuhan oksigen jaringan dan pembuangan karbon dioksida dapat dipenuhi lebih cepat'},
  q15:{section:'HOTS',type:'scalar',answer:'Perdarahan lebih sulit berhenti setelah terjadi luka'},
  q16:{section:'PISA-style',type:'scalar',answer:'Denyut meningkat saat kebutuhan tubuh naik lalu mendekati kondisi awal selama pemulihan'},
  q17:{section:'PISA-style',type:'scalar',answer:'Vena pulmonalis'},
  q18:{section:'PISA-style',type:'scalar',answer:'275 mL'},
  q19:{section:'PISA-style',type:'array',answer:['Vena kava','Atrium kanan','Ventrikel kanan','Arteri pulmonalis','Paru-paru']},
  q20:{section:'PISA-style',type:'scalar',answer:'Kapiler'}
});

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Blood Journey')
    .addItem('Siapkan / Perbaiki Sheet', 'setupBloodJourney')
    .addItem('Segarkan Rekap & Leaderboard', 'refreshBloodJourney')
    .addSeparator()
    .addItem('Hapus baris hasil yang dipilih', 'deleteSelectedResults')
    .addItem('Hapus SEMUA hasil siswa', 'clearAllResults')
    .addToUi();
}

function setupBloodJourney() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('Buka Apps Script dari Google Sheet yang akan dipakai.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', active.getId());
  ensureSheets_();
  refreshBloodJourney();
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    'Blood Journey siap',
    'Sheet Hasil, Rekap, dan Leaderboard sudah disiapkan. Setelah ini deploy Apps Script sebagai Web App dan salin URL /exec ke scripts/config.js di MPI.',
    ui.ButtonSet.OK
  );
}

function refreshBloodJourney() {
  ensureSheets_();
  refreshRecap_();
  refreshLeaderboardSheet_();
  SpreadsheetApp.flush();
}

function doPost(e) {
  try {
    ensureSheets_();
    const body = parseBody_(e);
    const action = String(body.action || 'submit').trim().toLowerCase();
    if (action !== 'submit') return json_({ ok: false, error: 'Action not allowed' });

    const row = validateSubmission_(body);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSpreadsheet_().getSheetByName(BJ.RESULTS_SHEET);
      sheet.appendRow(row);
      refreshRecap_();
      refreshLeaderboardSheet_();
    } finally {
      lock.releaseLock();
    }

    return json_({ ok: true, saved: true });
  } catch (err) {
    return json_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function doGet(e) {
  try {
    ensureSheets_();
    const action = String((e && e.parameter && e.parameter.action) || 'leaderboard').trim().toLowerCase();
    if (action !== 'leaderboard') return jsonOrJsonp_(e, { ok: false, error: 'Action not allowed' });

    const requested = Number((e && e.parameter && e.parameter.limit) || 30);
    const limit = Math.min(BJ.MAX_LEADERBOARD, Math.max(1, Number.isFinite(requested) ? requested : 30));
    const rows = buildLeaderboard_(limit);
    return jsonOrJsonp_(e, { ok: true, rows });
  } catch (err) {
    return jsonOrJsonp_(e, { ok: false, error: err && err.message ? err.message : String(err), rows: [] });
  }
}

function deleteSelectedResults() {
  ensureSheets_();
  const ss = getSpreadsheet_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  if (sheet.getName() !== BJ.RESULTS_SHEET) {
    ui.alert('Buka sheet "Hasil" terlebih dahulu, lalu pilih baris yang ingin dihapus.');
    return;
  }

  const range = sheet.getActiveRange();
  if (!range || range.getRow() <= 1) {
    ui.alert('Pilih satu atau beberapa baris data siswa di bawah header.');
    return;
  }

  const firstRow = Math.max(2, range.getRow());
  const lastRow = range.getLastRow();
  const count = lastRow - firstRow + 1;
  const answer = ui.alert(
    'Hapus hasil siswa?',
    `Anda akan menghapus ${count} baris dari sheet Hasil. Tindakan ini tidak dapat dibatalkan.`,
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return;

  sheet.deleteRows(firstRow, count);
  refreshBloodJourney();
}

function clearAllResults() {
  ensureSheets_();
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    'HAPUS SEMUA HASIL?',
    'Seluruh data siswa pada sheet Hasil akan dihapus. Header tetap dipertahankan. Tindakan ini tidak dapat dibatalkan.',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return;

  const sheet = getSpreadsheet_().getSheetByName(BJ.RESULTS_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  refreshBloodJourney();
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('Spreadsheet belum dikaitkan. Jalankan setupBloodJourney() dari editor Apps Script terlebih dahulu.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', active.getId());
  return active;
}

function ensureSheets_() {
  const ss = getSpreadsheet_();

  let results = ss.getSheetByName(BJ.RESULTS_SHEET);
  if (!results) results = ss.insertSheet(BJ.RESULTS_SHEET);
  if (results.getLastRow() === 0) results.getRange(1, 1, 1, BJ.HEADERS.length).setValues([BJ.HEADERS]);
  else {
    const existing = results.getRange(1, 1, 1, Math.max(results.getLastColumn(), BJ.HEADERS.length)).getValues()[0];
    let mismatch = false;
    for (let i = 0; i < BJ.HEADERS.length; i++) if (existing[i] !== BJ.HEADERS[i]) mismatch = true;
    if (mismatch) results.getRange(1, 1, 1, BJ.HEADERS.length).setValues([BJ.HEADERS]);
  }
  styleResultsSheet_(results);

  let recap = ss.getSheetByName(BJ.RECAP_SHEET);
  if (!recap) recap = ss.insertSheet(BJ.RECAP_SHEET);

  let leaderboard = ss.getSheetByName(BJ.LEADERBOARD_SHEET);
  if (!leaderboard) leaderboard = ss.insertSheet(BJ.LEADERBOARD_SHEET);
}

function styleResultsSheet_(sheet) {
  sheet.setFrozenRows(1);
  const header = sheet.getRange(1, 1, 1, BJ.HEADERS.length);
  header.setFontWeight('bold').setBackground('#0B5BA8').setFontColor('#ffffff');
  sheet.autoResizeColumns(1, BJ.HEADERS.length);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(16, 260);
}

function validateSubmission_(body) {
  const name = clean_(body.student_name, 60);
  const className = clean_(body.class_name, 10);
  const studentKey = clean_(body.student_key, 120);
  const attempt = Number(body.attempt_number || 1);
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};

  if (!name) throw new Error('Nama siswa wajib diisi.');
  if (!BJ.VALID_CLASSES.includes(className)) throw new Error('Kelas harus 8A atau 8B.');
  if (!studentKey) throw new Error('Student key tidak valid.');
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 100) throw new Error('Nomor percobaan tidak valid.');

  const official = scoreAnswers_(answers);
  const score = official.correctCount * 5;
  const category = categoryFromScore_(score);
  const breakdown = official.breakdown;
  const totalQuestions = 20;

  return [
    new Date(), studentKey, name, className, score, category, official.correctCount, totalQuestions, attempt,
    breakdown.Dasar.correct, breakdown.Dasar.total,
    breakdown.HOTS.correct, breakdown.HOTS.total,
    breakdown['PISA-style'].correct, breakdown['PISA-style'].total,
    JSON.stringify(breakdown)
  ];
}

function scoreAnswers_(answers) {
  const breakdown = {Dasar:{correct:0,total:0},HOTS:{correct:0,total:0},'PISA-style':{correct:0,total:0}};
  let correctCount = 0;
  Object.keys(QUIZ_SPECS).forEach(id => {
    const spec = QUIZ_SPECS[id];
    breakdown[spec.section].total++;
    if (answerIsCorrect_(spec, answers[id])) {
      correctCount++;
      breakdown[spec.section].correct++;
    }
  });
  return {correctCount, breakdown};
}

function answerIsCorrect_(spec, value) {
  if (spec.type === 'scalar') return value === spec.answer;
  if (spec.type === 'short') return spec.answer.map(norm_).includes(norm_(value));
  if (spec.type === 'array') return Array.isArray(value) && value.length === spec.answer.length && value.every((v,i)=>v===spec.answer[i]);
  if (spec.type === 'set') {
    if (!Array.isArray(value)) return false;
    return JSON.stringify(value.slice().sort()) === JSON.stringify(spec.answer.slice().sort());
  }
  if (spec.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Object.keys(spec.answer);
    if (Object.keys(value).length !== keys.length) return false;
    return keys.every(k => value[k] === spec.answer[k]);
  }
  return false;
}

function norm_(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function normalizeBreakdown_(value) {
  let obj = value;
  if (typeof value === 'string') {
    try { obj = JSON.parse(value); } catch (_) { obj = {}; }
  }
  obj = obj && typeof obj === 'object' ? obj : {};
  return {
    Dasar: normalizeSection_(obj.Dasar, 10),
    HOTS: normalizeSection_(obj.HOTS, 5),
    'PISA-style': normalizeSection_(obj['PISA-style'], 5)
  };
}

function normalizeSection_(section, defaultTotal) {
  section = section && typeof section === 'object' ? section : {};
  const total = clampInt_(section.total, 0, 100, defaultTotal);
  const correct = clampInt_(section.correct, 0, total, 0);
  return { correct, total };
}

function refreshRecap_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(BJ.RECAP_SHEET);
  const rows = readResultObjects_();
  const uniqueKeys = new Set(rows.map(r => r.studentKey)).size;
  const average = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.score, 0) / rows.length) : 0;
  const passed = rows.filter(r => r.score >= 75).length;

  sheet.clear();
  sheet.getRange('A1').setValue('REKAP BLOOD JOURNEY').setFontWeight('bold').setFontSize(16).setFontColor('#0B5BA8');
  sheet.getRange('A3:D3').setValues([['Siswa unik', 'Percobaan', 'Rata-rata nilai', 'Percobaan tuntas']]).setFontWeight('bold').setBackground('#EAF3FB');
  sheet.getRange('A4:D4').setValues([[uniqueKeys, rows.length, average, passed]]);

  sheet.getRange('A6:F6').setValues([['Kelas', 'Siswa unik', 'Percobaan', 'Rata-rata', 'Nilai terbaik', 'Tuntas']]).setFontWeight('bold').setBackground('#EAF3FB');
  const classRows = BJ.VALID_CLASSES.map(className => {
    const subset = rows.filter(r => r.className === className);
    const uniques = new Set(subset.map(r => r.studentKey)).size;
    const avg = subset.length ? Math.round(subset.reduce((s, r) => s + r.score, 0) / subset.length) : 0;
    const best = subset.length ? Math.max.apply(null, subset.map(r => r.score)) : 0;
    const pass = subset.filter(r => r.score >= 75).length;
    return [className, uniques, subset.length, avg, best, pass];
  });
  sheet.getRange(7, 1, classRows.length, 6).setValues(classRows);

  const bestRows = buildLeaderboard_(20);
  sheet.getRange('A11:E11').setValues([['Peringkat', 'Nama publik', 'Kelas', 'Nilai terbaik', 'Kategori']]).setFontWeight('bold').setBackground('#FFF4CF');
  if (bestRows.length) sheet.getRange(12, 1, bestRows.length, 5).setValues(bestRows.map((r, i) => [i + 1, r.display_name, r.class_name, r.score, r.category]));
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 6);
}

function refreshLeaderboardSheet_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(BJ.LEADERBOARD_SHEET);
  const rows = buildLeaderboard_(BJ.MAX_LEADERBOARD);
  sheet.clear();
  sheet.getRange('A1:E1').setValues([['Peringkat', 'Nama publik', 'Kelas', 'Nilai terbaik', 'Kategori']]).setFontWeight('bold').setBackground('#F4B942').setFontColor('#202938');
  if (rows.length) sheet.getRange(2, 1, rows.length, 5).setValues(rows.map((r, i) => [i + 1, r.display_name, r.class_name, r.score, r.category]));
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 5);
}

function buildLeaderboard_(limit) {
  const rows = readResultObjects_();
  const best = {};
  rows.forEach(r => {
    const key = r.studentKey || `${r.className}::${String(r.studentName).toLowerCase()}`;
    const prev = best[key];
    if (!prev || r.score > prev.score || (r.score === prev.score && r.timestamp < prev.timestamp)) best[key] = r;
  });

  return Object.keys(best)
    .map(k => best[k])
    .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp || a.studentName.localeCompare(b.studentName, 'id'))
    .slice(0, limit)
    .map(r => ({
      display_name: publicName_(r.studentName),
      class_name: r.className,
      score: r.score,
      category: r.category
    }));
}

function readResultObjects_() {
  const sheet = getSpreadsheet_().getSheetByName(BJ.RESULTS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, BJ.HEADERS.length).getValues();
  return values
    .filter(row => row[2] && row[3])
    .map(row => ({
      timestamp: row[0] instanceof Date ? row[0].getTime() : new Date(row[0]).getTime() || 0,
      studentKey: String(row[1] || ''),
      studentName: String(row[2] || ''),
      className: String(row[3] || ''),
      score: Number(row[4] || 0),
      category: String(row[5] || categoryFromScore_(Number(row[4] || 0))),
      correctCount: Number(row[6] || 0),
      attempt: Number(row[8] || 1)
    }));
}

function publicName_(name) {
  const parts = String(name || 'Siswa').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Siswa';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.slice(1).map(x => (x[0] || '').toUpperCase() + '.').join(' ')}`;
}

function categoryFromScore_(score) {
  return score >= 86 ? 'Sangat Baik' : score >= 75 ? 'Tuntas' : 'Perlu Penguatan';
}

function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (_) {}
  }
  const p = (e && e.parameter) || {};
  if (p.payload) {
    try { return JSON.parse(p.payload); } catch (_) {}
  }
  return p;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function jsonOrJsonp_(e, obj) {
  const prefix = String((e && e.parameter && e.parameter.prefix) || '').trim();
  if (prefix && /^[A-Za-z_$][0-9A-Za-z_$\.]{0,100}$/.test(prefix)) {
    return ContentService
      .createTextOutput(`${prefix}(${JSON.stringify(obj)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(obj);
}

function clean_(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function clampInt_(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
