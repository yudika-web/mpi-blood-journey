# QA REPORT — Blood Journey MPI v2.6 Google Sheets Edition

Tanggal: 2026-09-24

## Fokus perubahan
- Backend Supabase dihapus dari paket aktif.
- Backend diganti Google Apps Script + Google Sheets.
- Leaderboard tetap tersedia.
- Rekap guru dipindahkan ke Google Sheet privat.
- 20 soal, retry evaluasi, musik, game, simulasi, dan video tetap dipertahankan.

## Pemeriksaan statis
- `index.html` tersedia ✅
- `styles/app.css` tersedia ✅
- `scripts/app.js` tersedia ✅
- `scripts/backend.js` tersedia ✅
- `scripts/config.js` tersedia ✅
- `apps-script/Code.gs` tersedia ✅
- Musik `assets/audio/steady_movement.mp3` tersedia ✅
- Sintaks `scripts/app.js` lolos `node --check` ✅
- Sintaks `scripts/backend.js` lolos `node --check` ✅
- Supabase SDK sudah dihapus dari `index.html` ✅
- Folder backend Supabase sudah dihapus dari paket aktif ✅

## Fitur evaluasi
- Total 20 soal ✅
- 10 soal dasar ✅
- 5 HOTS ✅
- 5 PISA-style ✅
- Nilai <75 menampilkan retry ✅
- Attempt bertambah pada retry ✅
- Breakdown Dasar/HOTS/PISA-style dihitung ulang oleh Apps Script ✅
- 20 jawaban dinilai ulang di Apps Script sebelum nilai resmi ditulis ke Google Sheet ✅
- Jawaban mentah tidak disimpan di Google Sheet ✅

## Backend Google Sheets
- Submit hasil melalui `doPost` Apps Script ✅
- Leaderboard publik melalui JSONP read-only ✅
- Raw data siswa tidak diekspos via endpoint GET ✅
- Rekap guru berada di sheet privat ✅
- Menu hapus baris terpilih ✅
- Menu hapus semua hasil ✅
- Rekap per kelas 8A/8B ✅

## Catatan penting
Karena frontend GitHub Pages berbeda origin dengan Apps Script, submit siswa memakai POST sederhana `no-cors`. Browser menampilkan skor lokal untuk respons cepat, sedangkan Apps Script menghitung ulang 20 jawaban dan menyimpan nilai resmi di sheet `Hasil`. Verifikasi akhir hasil dapat dilakukan pada Google Sheet / leaderboard.

Leaderboard menggunakan JSONP dan hanya mengembalikan data non-sensitif: nama publik, kelas, nilai terbaik, dan kategori.

## Pengujian live yang masih perlu dilakukan oleh pengguna
- Deploy Apps Script Web App dengan URL `/exec`.
- Isi URL di `scripts/config.js`.
- Kirim satu hasil siswa nyata.
- Pastikan baris masuk ke sheet Hasil.
- Pastikan leaderboard tampil setelah reload/refresh.
