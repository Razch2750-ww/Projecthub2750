# Drafter Tracker - PT Rokindo Jaya Mandiri

Sistem Manajemen Proyek & Kalkulator Material Cold Room untuk PT Rokindo Jaya Mandiri. Aplikasi ini dirancang untuk mempermudah pelacakan proyek, penugasan tim, estimasi material, dan penghitungan beban panas (heat load) pada cold room.

## Fitur Utama

- **Dashboard**: Tinjauan ringkas mengenai statistik proyek aktif, tugas yang tertunda, dan jadwal terdekat, beserta log aktivitas tim secara real-time.
- **Proyek & Tugas**: Manajemen data proyek dengan Kanban-style tracking untuk tugas-tugas drafter. Mencakup pencatatan lokasi, riwayat proyek, komentar, dan status proyek (Tahap 1 - Tahap 6).
- **Kalender**: Visualisasi jadwal proyek, tenggat waktu tugas, dan timeline pekerjaan drafter.
- **Kalkulator Material**: Alat bantu estimasi kebutuhan material cold room (seperti ketebalan panel, jenis pintu, dan mesin).
- **Kalkulator Heat Load**: Perhitungan beban panas untuk menentukan spesifikasi mesin refrigerasi yang optimal sesuai dengan ukuran ruangan dan target suhu.
- **Manajemen Pengguna**: Sistem autentikasi dengan Firebase, membatasi akses hanya kepada personel yang berwenang (Admin/Anggota Tim).

## Teknologi

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Framer Motion (untuk animasi dan mikro-interaksi)
- **State Management & Context**: React Context API
- **Ikon**: Lucide React
- **Komponen**: Custom UI Components dengan dukungan Radix UI / Headless patterns (via utilitas `cn`, clsx, tailwind-merge)
- **Backend & Database**: Firebase (Authentication & Firestore)
- **Utilitas**: Date-fns (untuk manipulasi tanggal), Konva (untuk canvas), XLSX (untuk ekspor/impor data laporan)

## Prasyarat

Pastikan Anda telah menginstal:
- Node.js (versi terbaru yang direkomendasikan)
- npm atau yarn

## Instalasi dan Menjalankan Proyek Lokal

1. **Kloning atau Unduh Repositori**
   Pastikan Anda berada di direktori proyek.

2. **Instal Dependensi**
   Jalankan perintah berikut di terminal:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables**
   Salin file `.env.example` (jika ada) menjadi `.env` dan konfigurasikan kunci Firebase dan API yang dibutuhkan:
   ```bash
   cp .env.example .env
   ```
   Pastikan konfigurasi Firebase Anda (`VITE_FIREBASE_API_KEY`, dsb) diatur dengan benar agar aplikasi dapat terhubung ke database.

4. **Jalankan Development Server**
   ```bash
   npm run dev
   ```
   Server akan berjalan secara default, dan aplikasi bisa diakses melalui URL yang disediakan oleh Vite (biasanya `http://localhost:3000`).

5. **Build untuk Produksi**
   ```bash
   npm run build
   ```
   Hasil kompilasi akan berada di direktori `dist/`.

## Struktur Direktori Utama

- `/src/components` - Komponen UI yang dapat digunakan kembali (layout, modal, button, input, dll).
- `/src/context` - State management untuk otentikasi (AuthContext), proyek (ProjectContext), dan tema (ThemeContext).
- `/src/features` - Halaman-halaman utama aplikasi (Dashboard, Projects, CalendarView, dll).
- `/src/lib` - Berisi utilitas fungsi bantuan (helper functions).

## Lisensi

Hak Cipta © PT Rokindo Jaya Mandiri. Semua Hak Dilindungi.
