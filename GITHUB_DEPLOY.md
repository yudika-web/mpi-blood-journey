# Deploy Blood Journey v2.6 ke GitHub Pages

## Sebelum upload
Pastikan Google Apps Script sudah dideploy dan file `scripts/config.js` sudah berisi URL Web App `/exec`.

Contoh:
```js
window.BLOOD_JOURNEY_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycb.../exec'
};
```

## Cara upload paling mudah
1. Masuk ke GitHub.
2. Buat repository baru, misalnya `blood-journey-mpi`.
3. Upload **isi folder** Blood Journey v2.6 ke root repository.
4. Pastikan `index.html`, `assets/`, `scripts/`, dan `styles/` berada langsung di root.
5. Buka **Settings → Pages**.
6. Pada Build and deployment pilih source yang sesuai untuk branch utama / GitHub Pages.
7. Tunggu deployment selesai.
8. Buka URL Pages dari HP dan lakukan tes evaluasi + leaderboard.

## Catatan
- Folder `apps-script/` boleh ikut disimpan sebagai dokumentasi. File itu tidak dijalankan oleh GitHub Pages.
- Jangan mengubah struktur folder aset karena path di HTML/JS menggunakan path relatif.
- Tidak ada secret key di frontend. URL Web App Apps Script memang diperlukan oleh browser untuk mengirim hasil.
