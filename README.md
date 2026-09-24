# Blood Journey MPI v2.6 — Google Sheets / Apps Script Edition

Media Pembelajaran Interaktif IPA kelas VIII untuk materi Sistem Transportasi / Peredaran Darah Manusia.

## Fitur utama
- Mobile-first untuk HP.
- Akses menu **bertahap**.
- Materi jantung, pembuluh, sirkulasi ganda, plasma, eritrosit, leukosit, trombosit, gangguan, dan kesehatan.
- Zoom gambar ilmiah.
- Simulasi peredaran darah lokal 2D.
- Video YouTube Part 1 & Part 2.
- Musik latar `Steady Movement.mp3` + efek suara.
- Evaluasi **20 soal**: 10 dasar + 5 HOTS + 5 PISA-style.
- Retry evaluasi bila nilai < 75.
- Game **Misi Sel Darah**.
- Leaderboard publik nilai terbaik.
- Rekap guru di **Google Sheets**.
- Penghapusan data siswa dilakukan langsung dari menu khusus di Google Sheet.
- Frontend siap diunggah ke GitHub Pages.

## Arsitektur sederhana

```text
GitHub Pages / hosting statis
        ↓
Blood Journey MPI
        ↓
Google Apps Script Web App
        ↓
Google Sheet milik guru
  ├── Hasil
  ├── Rekap
  └── Leaderboard
```

## File penting
- `index.html` — halaman utama MPI.
- `styles/app.css` — UI/UX.
- `scripts/app.js` — logika materi, kuis, simulasi, game, musik.
- `scripts/backend.js` — pengiriman hasil + leaderboard Google Apps Script.
- `scripts/config.js` — URL Web App Apps Script.
- `apps-script/Code.gs` — backend Google Sheets / Apps Script.
- `GOOGLE_SHEETS_SETUP.md` — tutorial setup 5–10 menit.
- `GITHUB_DEPLOY.md` — tutorial upload GitHub Pages.
- `docs/QA_REPORT_v2_6.md` — hasil QA teknis.

## Setup singkat
1. Buat Google Sheet baru.
2. Extensions → Apps Script.
3. Tempel `apps-script/Code.gs`.
4. Jalankan `setupBloodJourney()` sekali dan izinkan akses.
5. Deploy → New deployment → Web app.
6. Execute as: **Me**; Who has access: **Anyone**.
7. Salin URL yang berakhir `/exec`.
8. Tempel ke `scripts/config.js`.
9. Upload isi folder ini ke GitHub Pages.

Detail lengkap: `GOOGLE_SHEETS_SETUP.md`.

## Privasi / guru
MPI publik **tidak menyimpan password guru**. Guru mengelola data langsung dari Google Sheet privat. Endpoint publik hanya menerima hasil siswa dan mengeluarkan leaderboard yang sudah disederhanakan (nama publik, kelas, nilai terbaik, kategori).

## Catatan skor
Skor tampil langsung di browser, tetapi Apps Script juga menghitung ulang 20 jawaban di server sebelum menyimpan nilai resmi ke Google Sheet. Jawaban mentah tidak disimpan; yang disimpan hanya ringkasan hasil, percobaan, dan breakdown Dasar/HOTS/PISA-style.
