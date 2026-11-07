# Pedoman & Aturan Pengembangan (Development Rules) — PelatihKu PRO
**Aturan Baku untuk Pengembang Perangkat Lunak dan Asisten AI (AI Studio Agents)**  
**Target Aplikasi:** Fitness Center & Personal Training Management OS  
**Versi:** 2.7.7  

---

## 1. Identitas Pokok & Domain Aplikasi (Wajib Dipatuhi)

1. **Nama Pelatih (Lead Coach):**
   - **Nama Resmi:** `Panji Akbar Syamsi` atau `Coach Panji Akbar Syamsi` (dengan gelar opsional `S.Or.` di layar kredensial).
   - **Inisial Avatar:** `PAS`.
   - **Jabatan:** `Head Coach & Master Fitness Trainer`.
   - **Email Resmi:** `panji.akbar@pelatihku.id`.
   - **DILARANG KERAS** menggunakan nama pelatih lama (contoh: *Hendra*, *Coach Hendra*). Setiap referensi pelatih baru harus merujuk ke Panji Akbar Syamsi.

2. **Konteks Domain: Fitness Center & Personal Training:**
   - Aplikasi ini beroperasi dalam ekosistem **Fitness Center / Klub Kebugaran Komersial & Privat** (bukan sekadar gym rumahan atau aplikasi lari kasual).
   - Seluruh fitur berpusat pada hubungan profesional antara **Personal Trainer (PT)** dan **Member Fitness Center**.

---

## 2. Glosarium Terminologi (Terminology Consistency Matrix)

Gunakan istilah yang baku, profesional, dan lazim digunakan di industri fitness center Indonesia. Jangan mencampurkan istilah kasual yang merusak citra profesional aplikasi:

| Istilah Terlarang / Hindari ❌ | Istilah Wajib Digunakan ✅ | Konteks Penggunaan |
| :--- | :--- | :--- |
| Klien / Client (dalam konteks umum) | **Member** / **Member Fitness Center** | Direktori, kartu list, bento metric, kuota PT |
| Sesi Latihan Kasual | **Sesi PT** / **Sesi Personal Training** | Kalender, logging workout, bento sesi mingguan |
| Pelatih Biasa / Guru Senam | **Personal Trainer (PT)** / **Head Coach Panji** | Label profil, header, drawer, signature |
| Paket Gym | **Paket Sesi PT** (12 / 24 / 36 Sesi) | Billing, onboarding member, kuota terpakai |
| Tempat Fitness / Lapangan | **Fitness Center** / **Klub Kebugaran** / **Lantai Gym (Gym Floor)** | Lokasi sesi, zonasi kerja |
| Cek Kesehatan Kasual | **Movement Screening** / **PAR-Q & Riwayat Medis** | Tab medis lanjut, onboarding |
| Rekor Beban | **Personal Record (PR)** / **Estimasi 1RM (One-Rep Max)** | Logger latihan, kalkulasi kekuatan |
| Foto Selfie | **Dokumentasi Foto Fisik (Check-in Fisik)** | Galeri progres visual member |
| Form Tambah Klien | **Tambah Member Baru** | Modal registrasi onboarding |

---

## 3. Aturan Desain Antarmuka (UI/UX) & Tailwind CSS

1. **Palet Warna & Tema Gelap (Dark Mode OLED Standards):**
   - Background Utama: `#0B0F17` (Deep Dark Navy/Slate) atau `surface: #0c1322`.
   - Container Kartu: `#111827` / `#141b2b` dengan border tipis `border-white/[0.08]`.
   - Warna Aksen Primer (Primary Accent): Emerald/Mint (`#10b981` / `#4edea3`).
   - Warna Aksen Sekunder & Peringatan: Amber/Gold (`#ffb95f` / `#ee9800`) untuk indikator sesi dan progress bar.
   - Warna Destruktif / Keluar: Rose/Red (`#ef4444` / `#93000a`).
   - Teks Utama: `text-white` (Headings) dan `text-neutral-300` / `#bbcabf` (Body text).
   - Teks Sekunder/Muted: `text-neutral-400` / `#86948a` / `text-neutral-500`.

2. **Disiplin Tombol Mengambang (Floating Action Button):**
   - **Bentuk:** Wajib lingkaran sempurna (`w-14 h-14 rounded-full`).
   - **DILARANG** mengubah tombol floating menjadi bentuk pill lonjong yang memuat teks panjang (seperti `[≡ Menu]`) karena akan menghalangi teks dan filter di belakangnya.
   - **Posisi:** `fixed bottom-6 right-5 z-40`.
   - **Interaksi dengan Modal:** Jika ada modal/overlay aktif (`isAnyOverlayOpen`), tombol floating **wajib otomatis disembunyikan** dengan kelas `opacity-0 pointer-events-none scale-90` agar tidak menimpa atau mengganggu modal `z-50`.
   - **Bantalan Konten Utama:** Elemen `<main>` wajib memiliki bantalan bawah minimal `pb-28` (112px) agar kartu dan tombol di daftar terbawah dapat digulir bebas tanpa tertutup tombol floating.

3. **Ukuran Target Sentuh (Touch Target Accessibility):**
   - Seluruh tombol, switch, dan input form wajib memiliki area sentuh minimal **44x44 piksel** (`min-h-[44px]` dan `min-w-[44px]`).
   - Jangan membuat tombol ikon mikro (< 32px) tanpa padding sentuh yang memadai, mengingat pelatih mengoperasikan aplikasi sambil berdiri atau memegang peralatan gym.

---

## 4. Aturan Arsitektur Kode & Pengelolaan State

1. **Penyimpanan Lokal (Persistence Strategy):**
   - Kunci penyimpanan lokal saat ini:
     - `STORAGE_KEYS.CLIENTS = 'pelatihku_v45_clients'`
     - `STORAGE_KEYS.COACH = 'pelatihku_v45_coach'`
   - **Auto-Migration Guard:** Saat membaca data dari `localStorage`, kode wajib memeriksa jika data pelatih lama masih tersimpan (misal tertera nama selain Panji Akbar Syamsi), dan secara transparan memutakhirkannya ke `Coach Panji Akbar Syamsi` tanpa merusak data latihan member.

2. **Alur Pasca-Submit Tambah Member Baru:**
   - Setelah pelatih mengisi modal `Tambah Member Baru` dan menekan Simpan:
     1. Simpan record member baru ke state `clients` dan sinkronkan ke `localStorage`.
     2. Tutup modal `showAddClientModal(false)`.
     3. **Langsung arahkan layar aktif ke Profil Detail member tersebut** (`handleSelectClient(newClient.id)`).
     4. Tampilkan notifikasi toast: *"Member [Nama] ([X] Sesi) terdaftar! Silakan lengkapi profil & data lanjutan."*

3. **Integritas Kalkulasi Kebugaran:**
   - **Kalkulasi 1RM (One-Rep Max):** Gunakan formula Epley: $\text{1RM} = \text{Beban} \times (1 + \frac{\text{Reps}}{30})$.
   - **Kalkulasi Baseline Kalori & Makronutrisi:**
     - *Fat Loss:* $\approx \text{Berat (kg)} \times 26\text{ kkal}$, Protein $\approx 2.0\text{g} \times \text{Berat (kg)}$.
     - *Hipertrofi:* $\approx \text{Berat (kg)} \times 34\text{ kkal}$, Protein $\approx 2.0\text{g} \times \text{Berat (kg)}$.
     - *Powerlifting:* $\approx \text{Berat (kg)} \times 32\text{ kkal}$, Protein $\approx 2.2\text{g} \times \text{Berat (kg)}$.

4. **Komponen Kalender Sesi (SessionsCalendarView):**
   - Wajib mempertahankan tiga opsi mode tampilan:
     - `'day'` (Timeline detail per jam lantai gym)
     - `'week'` (Distribusi jadwal 7 hari)
     - `'month'` (Matriks ringkasan bulanan)
   - Setiap sesi memiliki properti: `clientId`, `clientName`, `time`, `date`, `focus`, `location`, `confirmed`.

---

## 5. Protokol Modifikasi Fitur Baru (Guide for Developers & AI)

Sebelum menambahkan atau memodifikasi komponen, patuhi langkah-langkah berikut:

1. **Pengecekan Backward Compatibility:**
   - Pastikan penambahan field baru pada interface `ClientProfile` bersifat opsional (`?`) atau memiliki nilai default fallback yang aman di `INITIAL_CLIENTS`.
2. **Tidak Boleh Menghapus Fitur Eksisting yang Sedang Berfungsi:**
   - Fitur-fitur seperti *Biometric/PIN Login*, *PR Board*, *Rest Timer*, *Workout Logger*, *Reschedule Modal*, *Progress Photos*, dan *Macro Tracker* harus tetap utuh.
3. **Disiplin Eksekusi Tool & Lingkungan:**
   - Dev server berjalan di **Port 3000**.
   - Hindari penggunaan `window.alert` atau `window.prompt`; gunakan komponen modal internal dan sistem Toast `showToast()`.
   - Jangan mengubah atribut `"name"` pada `metadata.json` (wajib dipertahankan sesuai instruksi lingkungan).
4. **Verifikasi Build & Lint:**
   - Setiap selesai mengedit file `.tsx` atau `.ts`, jalankan `compile_applet` dan `lint_applet` bersamaan untuk memastikan 0 error tipe TypeScript dan 0 lint warning.

---

## 6. Checklist Verifikasi Rilis (QA Checklist)

- [ ] Nama pelatih di seluruh layar tertulis **Coach Panji Akbar Syamsi** (inisial **PAS**).
- [ ] Istilah **Member**, **Sesi PT**, **Fitness Center**, dan **Paket Sesi** konsisten.
- [ ] Tombol floating navigasi berbentuk lingkaran (`w-14 h-14`) dan otomatis hilang saat modal terbuka.
- [ ] Modal "Tambah Member Baru" mengarahkan langsung ke profil member setelah disubmit.
- [ ] Kalender Sesi memiliki switch Day / Week / Month yang responsif.
- [ ] Tab "Data Medis Lanjut" dapat menyimpan catatan screening postur, detail nutrisi, dan foto baseline.
- [ ] `compile_applet` dan `lint_applet` lolos tanpa kompilasi gagal.

---

## 7. Aturan Penomoran Versi (Semantic Versioning 2.0.0), Sinkronisasi Rilis & Evolusi Skema Data

Setiap pembaruan aplikasi PelatihKu PRO wajib mengikuti tata kelola versi yang ketat, terstandarisasi, dan deterministik:

### 7.1 Spesifikasi SemVer 2.0.0 (`vMAJOR.MINOR.PATCH`)

| Tingkatan | Format | Pemicu Kenaikan (Trigger Conditions) | Contoh Kasus PelatihKu PRO |
| :--- | :--- | :--- | :--- |
| **MAJOR** | `X.0.0` | Perubahan arsitektur mendasar, perubahan skema database Cloud Firestore yang *breaking* tanpa adapter backward-compatible, atau perombakan sistem autentikasi. | Migrasi arsitektur dari single-coach ke multi-gym enterprise, pemecahan struktur dokumen member menjadi sub-koleksi tanpa adapter otomatis. |
| **MINOR** | `0.X.0` | Penambahan fitur fungsional baru yang kompatibel ke belakang (*backward-compatible*), penambahan modal/alur UI baru, atau field skema baru yang bersifat opsional. | Penambahan modal Ubah Data Member, penambahan tab visualisasi 3D biomekanik gerakan, penambahan generator program latihan berbasis AI Gemini. |
| **PATCH** | `0.0.X` | Perbaikan bug fungsional, perbaikan formula kalkulasi kebugaran (1RM / kalori baseline), penyempurnaan UI/UX OLED Dark Mode, peningkatan area sentuh 44px, atau perbaikan dependensi. | Perbaikan persistensi penambahan jadwal ke Firestore, perbaikan sanitasi field `undefined` pada `setDoc()`, perbaikan kalkulasi label hari di kalender. |

### 7.2 Aturan Sumber Tunggal Kebenaran (Single Source of Truth Synchronization)
Saat menaikkan nomor versi aplikasi, SELURUH referensi berikut **wajib diperbarui secara sinkron dan atomik dalam satu komit rilis**:
1. **`package.json`**: Field `"version": "X.Y.Z"` sebagai sumber utama kebenaran (*single source of truth*).
2. **PWA Service Worker (`public/sw.js`)**:
   - Header komentar versi: `Version: X.Y.Z`
   - Cache bucket name: `const CACHE_NAME = 'pelatihku-vX.Y.Z';`
   - Mekanisme pembersihan cache lama (`caches.delete()`) harus aktif di event `activate`.
3. **Web App Manifest (`public/manifest.json`)**: Metadata aplikasi yang merefleksikan versi dan build.
4. **Header Dokumen Pedoman**: Header versi di baris atas `DEVELOPMENT_RULES.md` dan `APP_REQUIREMENTS.md`.

### 7.3 Standar Komit Git & Tagging Rilis
1. **Format Pesan Komit (Conventional Commits)**:
   - `feat(scope): deskripsi fitur baru`
   - `fix(scope): deskripsi perbaikan bug`
   - `perf(scope): peningkatan performa atau memori`
   - `style(scope): penyesuaian visual / CSS / token warna`
   - `refactor(scope): restrukturisasi kode tanpa mengubah perilaku`
   - `chore(release): bump version to vX.Y.Z`
2. **Git Release Tagging**:
   - Setiap rilis ke staging atau production Firebase Hosting wajib diberi tag teranotasi:
     ```bash
     git tag -a vX.Y.Z -m "Release vX.Y.Z: <Ringkasan Fitur & Perbaikan Kunci>"
     git push origin vX.Y.Z
     ```

### 7.4 Aturan Evolusi Skema Data & Cloud Firestore
1. **Ketahanan Kompatibilitas ke Belakang (Backward Compatibility)**:
   - Setiap penambahan field baru pada antarmuka `ClientProfile`, `CoachProfileData`, atau `SessionRecord` wajib bersifat opsional (`field?: type`) atau memiliki nilai default fallback yang aman di `INITIAL_CLIENTS`.
   - Kode aplikasi tidak boleh berasumsi bahwa dokumen historis di Firestore memiliki field yang baru saja ditambahkan.
2. **Sanitasi Data Firestore (`sanitizeForFirestore`)**:
   - Dilarang mengirimkan nilai `undefined` ke dalam operasi `setDoc()`, `updateDoc()`, atau `writeBatch()`.
   - Wajib menggunakan fungsi `sanitizeForFirestore()` untuk membersihkan nilai `undefined` sebelum data dikirim ke Firestore.
3. **Penyimpanan Lokal Multi-Tab (`persistentLocalCache`)**:
   - Koneksi Firestore di sisi browser wajib mempertahankan `persistentMultipleTabManager()` dan `ignoreUndefinedProperties: true` untuk kelancaran offline caching di lantai gym.

### 7.5 Protokol Cache-Busting PWA & Hosting Header
1. **Strategi Cache-Busting**:
   - File statis ber-hash (`/assets/**.js`, `/assets/**.css`) disajikan dengan `Cache-Control: public, max-age=31536000, immutable`.
   - File dinamis pembungkus (`/index.html`, `/sw.js`) wajib disajikan dengan `Cache-Control: no-cache, no-store, must-revalidate` agar browser member dan pelatih selalu mengunduh versi rilis terbaru tanpa tertahan cache lawas.
2. **Pre-Release Verification Gate**:
   - Wajib memastikan 0 error tipe pada `tsc --noEmit`.
   - Wajib memastikan `npm run build` selesai tanpa kegagalan bundle sebelum melakukan *firebase deploy*.


### 7.6 Konfigurasi Akun Firebase & Target Deployment Resmi
1. **Akun Google / Firebase Resmi**: `fauziealiakhmad@gmail.com`
2. **Project ID & Hosting Site**:
   - **Project ID**: `pelatihku-pro` (alias `default` pada `.firebaserc`)
   - **Hosting Site**: `pelatihku-pro`
   - **URL Produksi Resmi**: `https://pelatihku-pro.web.app/`
   - **DILARANG KERAS** melakukan deployment kode repositori ini ke project lain pada akun yang sama (seperti `jastip-cb-manager-2026` atau `resume-al-2026`).
3. **Verifikasi Environment Sebelum Deploy (`firebase-mcp-server` / Firebase CLI)**:
   - Pastikan selalu memeriksa `firebase_get_environment` sebelum memanggil `firebase_deploy`.
   - Pastikan `Project Directory` mengarah ke `c:\Users\AL_AAF\Project\Pelatihku\PelatihKu-Athletic-Coaching-OS` dan `Active Project ID` adalah `pelatihku-pro`.
