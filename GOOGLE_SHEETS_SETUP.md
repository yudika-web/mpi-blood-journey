# Setup Google Sheets + Apps Script — 5–10 Menit

## 1. Buat Google Sheet
Buat spreadsheet baru dan beri nama misalnya **Blood Journey - Hasil Siswa**.

## 2. Buka Apps Script
Di Google Sheet pilih:
**Extensions → Apps Script**.

Hapus kode contoh di editor, lalu salin seluruh isi file:
`apps-script/Code.gs`

Tempel ke `Code.gs`, lalu Save.

## 3. Jalankan setup sekali
Di daftar fungsi, pilih:
`setupBloodJourney`

Klik **Run**.

Google akan meminta izin karena script akan membaca/menulis spreadsheet. Izinkan menggunakan akun Google Anda.

Setelah selesai, kembali ke Google Sheet. Akan tersedia:
- **Hasil** — seluruh percobaan siswa.
- **Rekap** — ringkasan siswa, percobaan, rata-rata, ketuntasan, rekap per kelas.
- **Leaderboard** — nilai terbaik tiap siswa.

Menu baru **Blood Journey** juga muncul di menu Google Sheet.

## 4. Deploy sebagai Web App
Di Apps Script pilih:
**Deploy → New deployment**.

Pilih type: **Web app**.

Gunakan pengaturan:
- Description: `Blood Journey API`
- Execute as: **Me**
- Who has access: **Anyone**

Klik **Deploy**.

Salin URL Web App yang berakhir dengan `/exec`.

Contoh:
`https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec`

## 5. Hubungkan MPI
Buka:
`scripts/config.js`

Ganti placeholder:
```js
window.BLOOD_JOURNEY_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR-DEPLOYMENT-ID/exec'
};
```

menjadi URL `/exec` milik Anda.

## 6. Tes
Jalankan MPI, isi nama dan kelas, selesaikan evaluasi, lalu cek sheet **Hasil**.

Apps Script menghitung ulang jawaban siswa sebelum menyimpan nilai resmi. Jawaban mentah tidak disimpan di sheet.

Data yang dicatat:
- Timestamp
- Student Key
- Nama
- Kelas
- Nilai
- Kategori
- Jumlah benar
- Total soal
- Percobaan ke-
- Skor Dasar
- Skor HOTS
- Skor PISA-style
- Breakdown JSON

## 7. Rekap guru
Guru tidak login di MPI. Guru cukup membuka Google Sheet miliknya.

Gunakan menu **Blood Journey** di Google Sheet:
- **Siapkan / Perbaiki Sheet**
- **Segarkan Rekap & Leaderboard**
- **Hapus baris hasil yang dipilih**
- **Hapus SEMUA hasil siswa**

Untuk menghapus satu/lebih hasil:
1. Buka sheet **Hasil**.
2. Pilih baris data yang ingin dihapus.
3. Menu **Blood Journey → Hapus baris hasil yang dipilih**.

## 8. Leaderboard
MPI membaca leaderboard publik melalui Apps Script.
Yang tampil ke siswa hanya:
- nama publik yang disederhanakan,
- kelas,
- nilai terbaik,
- kategori.

Raw data siswa tetap hanya ada di Google Sheet guru.

## 9. Jika mengubah Code.gs
Setelah mengedit kode Apps Script:
1. Save.
2. Deploy → Manage deployments.
3. Edit deployment.
4. Pilih **New version**.
5. Deploy lagi.

URL `/exec` biasanya tetap sama selama Anda memperbarui deployment yang sama.

## Troubleshooting
**Hasil tidak masuk ke Sheet**
- Pastikan URL `scripts/config.js` berakhir `/exec`.
- Pastikan deployment Web App memberi akses **Anyone**.
- Pastikan fungsi `setupBloodJourney()` sudah pernah dijalankan.

**Leaderboard tidak muncul**
- Pastikan sudah ada data di sheet Hasil.
- Jalankan menu **Blood Journey → Segarkan Rekap & Leaderboard**.
- Reload MPI.

**Menu Blood Journey tidak muncul di Sheet**
- Reload spreadsheet setelah menyimpan script.
- Jika perlu, jalankan `onOpen()` sekali dari editor.
