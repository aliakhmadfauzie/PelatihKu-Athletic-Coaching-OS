# Dokumen Spesifikasi Kebutuhan Aplikasi (PRD) — PelatihKu PRO
**Sistem Operasi Manajemen Member & Personal Training (PT) Fitness Center**  
**Lead Coach:** Panji Akbar Syamsi, S.Or. (Master Fitness Trainer)  
**Versi Dokumen:** 2.7.5  
**Status:** Aktif & Terverifikasi

---

## 1. Ringkasan Eksekutif & Visi Produk
**PelatihKu PRO** adalah aplikasi web progresif (PWA-ready) mobile-first yang dirancang khusus untuk Personal Trainer (PT) dan Head Coach di lingkungan **Fitness Center & Klub Kebugaran Komersial/Privat** (seperti Fitness Center Senayan, SCBD District 8, dan Mega Gym). 

Aplikasi ini mendigitalkan dan mengintegrasikan seluruh alur operasional kepelatihan:
1. **Keamanan & Autentikasi Cepat di Lantai Gym:** Login biometrik (Face ID / Touch ID) dan PIN 6-digit dengan mode fallback nomor WhatsApp/email.
2. **Dashboard Eksekutif & KPI Bento:** Pemantauan real-time kuota member aktif, target pencapaian transformasi, progres sesi mingguan, dan rasio kepatuhan.
3. **Direktori & Profil Mendalam Member Fitness Center:** Tracking status paket sesi PT (kuota total vs terpakai), fase periodisasi latihan (*Foundation*, *Hypertrophy*, *Peak Strength*), metrik komposisi tubuh (berat, body fat %, lingkar tubuh, visceral fat).
4. **Data Medis Lanjut (PAR-Q) & Baseline Nutrition:** Riwayat cedera, screening postur (*movement screening*), makronutrisi harian (kalori, protein, karbohidrat, lemak, hidrasi), dan dokumentasi visual foto kondisi fisik awal.
5. **Workout Logger & Exercise Catalog:** Pencatatan set latihan per sesi (beban kg, repetisi, RPE), kalkulasi otomatis 1RM (*one-rep max*), dan deteksi *Personal Record* (PR).
6. **Kalender Sesi Terintegrasi (Day, Week, Month):** Penjadwalan interaktif sesi personal training dengan switch tampilan harian, mingguan, dan bulanan, serta fitur reschedule instan.
7. **Portofolio & Kredensial Pelatih:** Manajemen lisensi federasi resmi, spesialisasi *Strength & Conditioning*, zonasi lantai gym, dan pembatasan kuota kapasitas member.

---

## 2. Persona Pengguna & Konteks Lapangan
### 2.1 Persona Utama: Personal Trainer / Head Coach (Panji Akbar Syamsi)
- **Lingkungan Kerja:** Lantai fitness center (gym floor) yang dinamis, bising, bertempo cepat dengan penggunaan tangan dominan satu tangan (*one-handed mobile touch*).
- **Kebutuhan Kritis:**
  - Input data cepat (< 45 detik) di sela-sela istirahat set member (*rest interval*).
  - Akses riwayat cedera dan batasan medis member sebelum memulai latihan beban compound.
  - Memastikan kuota paket sesi PT member terpantau akurat untuk administrasi perpanjangan paket.
  - Tampilan kontras tinggi (Dark Mode bertaraf OLED) yang hemat daya dan terbaca jelas di bawah pencahayaan gym.

### 2.2 Persona Sekunder: Member Fitness Center
- **Kategori Member:** Eksekutif muda, atlet rekreasi, wanita pascamelahirkan, dan member umum yang mengambil paket sesi Personal Training (12, 24, 36 sesi) untuk tujuan Fat Loss, Hipertrofi Otot, maupun Powerlifting.

---

## 3. Arsitektur Informasi & Alur Pengguna (User Flows)

```
[Login Screen: Biometrik / PIN 6-Digit / Kredensial]
                     │
                     ▼
             [Dashboard Utama]
        ┌────────────┴─────────────┐
        ▼                          ▼
[Ringkasan KPI Bento]     [Direktori Member PT] ──► [+ Tambah Member Baru]
        │                          │                           │
        │                          ▼                           ▼
        │                 [Profil Detail Member] ◄─────────────┘
        │                ┌─────────┴─────────┐
        │                ▼                   ▼
        │        [Tabs Informasi]     [Quick Actions: Kalibrasi Metrik,
        │        - Ringkasan Latihan   Catat Sesi PT, Reschedule,
        │        - Riwayat & PR        Kirim WhatsApp]
        │        - Data Medis Lanjut
        │        - Nutrisi & Hidrasi
        │        - Dokumentasi Foto
        ▼
[Kalender Sesi: Day / Week / Month] ◄─── (Floating Nav Button / Bento Sesi)
        │
        ▼
[Profil Kredensial Coach Panji] ◄─── (Avatar Badge / Drawer Menu)
```

---

## 4. Rincian Modul & Fitur Aplikasi

### Modul 1: Autentikasi & Keamanan Sesi (LoginScreen.tsx)
- **Komponen Kunci:**
  - Header profil pelatih aktif: *Coach Panji Akbar Syamsi, S.Or.* (*Head Coach & Master Fitness Trainer*).
  - Tombol aksi biometrik satu ketukan (*Face ID / Touch ID*) dengan feedback getar/visual.
  - Numpad virtual PIN 6-digit responsif dengan indikator dot terlindung.
  - Opsi login alternatif via Email/WhatsApp dan Sandi dengan *show/hide toggle*.
  - Penyimpanan token sesi lokal (`isLocked = false`).

### Modul 2: Dashboard Eksekutif & KPI Bento (App.tsx)
- **Bento 1 — Total Member Aktif:** Menghitung total member aktif di bawah bimbingan Coach Panji beserta delta pertumbuhan bulan berjalan.
- **Bento 2 — Sesi Minggu Ini:** Menampilkan total sesi yang dijadwalkan minggu ini (contoh: 26/38 selesai). Kartu ini bersifat interaktif: dapat diklik untuk membuka **Sessions Calendar View**.
- **Bento 3 — Target Tercapai:** Mengagregasi jumlah member yang berhasil mencapai target komposisi tubuh (>3 kg fat loss atau surplus massa otot).
- **Bento 4 — Kepatuhan Sesi:** Visualisasi sparkline persentase kehadiran member pada sesi gym floor terjadwal (94.2%).

### Modul 3: Direktori & Pencarian Member Fitness Center
- **Bilah Pencarian & Filter Cepat:**
  - Filter real-time berdasarkan input teks (nama member, nomor telepon, catatan target).
  - Filter Dropdown Status (*Semua Status*, *Aktif*, *Cuti*).
  - Filter Dropdown Target Kebugaran (*Fat Loss*, *Hipertrofi*, *Powerlifting*).
  - Reset filter satu ketukan.
- **Kartu Member:**
  - Inisial avatar berkode warna dinamis.
  - Badge gender, usia, dan status keaktifan.
  - Ringkasan target utama, berat terkini vs target, dan delta perubahan (contoh: -3.4 kg).
  - Status sesi terakhir dan tombol cepat WhatsApp & Profil Detail.

### Modul 4: Formulir Onboarding Member Baru (+ Tambah Member)
- **Field Identitas:** Nama lengkap, usia, jenis kelamin, nomor WhatsApp, pekerjaan/tingkat mobilitas.
- **Field Paket Sesi PT:** Pilihan paket 12, 24, atau 36 sesi (atau kustom), pemilihan lokasi gym (*Gym Utama Senayan*, *SCBD District 8*, *Private Studio Kemang*).
- **Field Target & Baseline Awal:** Kategori program, berat badan awal, estimasi target berat badan, estimasi body fat %, lingkar pinggang awal.
- **Catatan Medis & Kebugaran Khusus:** Riwayat cedera lampau (contoh: *lower back tightness*, *knee ACL reconstruction*).
- **Alur Pasca-Submit:** Aplikasi secara otomatis menyimpan data ke `localStorage`, menutup modal, dan **langsung mengarahkan pelatih ke halaman profil detail member tersebut** untuk melengkapi data medis lanjut atau jadwal sesi pertama.

### Modul 5: Profil Detail Member (ClientDetailView.tsx)
- **Header Profil:** Avatar besar, kode ID member resmi (`#KLN-2026-xxx`), status paket sesi (contoh: *18/24 Sesi Terpakai*), dan tombol aksi cepat (*WhatsApp Direct*, *Update Metrik*, *Catat Sesi*).
- **Tab Navigasi Lengkap:**
  1. **Ringkasan:** Ringkasan target, fase periodisasi, kartu jadwal sesi berikutnya dengan tombol reschedule, serta grafik tren komposisi tubuh 8 minggu.
  2. **Riwayat Sesi & PR:** Tabel riwayat sesi lengkap dengan daftar set latihan, serta papan *Personal Record* (PR) dengan estimasi 1RM (*Epley formula*).
  3. **Data Medis Lanjut & Baseline:**
     - Kuisioner Kesiapan Aktivitas Fisik (PAR-Q) & evaluasi riwayat cedera.
     - Screening mobilitas postur (*squat depth*, rotasi bahu, lordosis/kifosis).
     - Target makronutrisi harian presisi (Kalori kkal, Protein g, Karbohidrat g, Lemak g, Hidrasi L).
     - Foto referensi fisik awal (tampak depan/samping/belakang) untuk komparasi jangka panjang.
  4. **Nutrisi & Hidrasi Mingguan:** Check-in 7 hari kepatuhan pola makan dengan catatan langsung dari Coach Panji.
  5. **Dokumentasi Foto Fisik:** Galeri foto berkala untuk memvalidasi perubahan rekomposisi tubuh.

### Modul 6: Workout Logger & Exercise Catalog
- **Pencatatan Berbasis Set:** Setiap latihan memuat set berulang dengan kolom: *Set #*, *Beban (kg)*, *Repetisi*, *RPE (Rate of Perceived Exertion 6-10)*, dan *Checkbox PR*.
- **Katalog Gerakan Terintegrasi:** Barbell Back Squat, Conventional Deadlift, Romanian Deadlift (RDL), Barbell Bench Press, Incline Dumbbell Press, Pull-Up, Lat Pulldown, Overhead Barbell Press (OHP), Dumbbell Lateral Raise, Bicep Curl, Cable Tricep Extension, Plank.
- **Otomasi PR Board:** Jika set dicentang sebagai PR atau beban melampaui rekor historis, sistem otomatis mendaftarkannya ke papan PR member dengan notifikasi visual.

### Modul 7: Kalender Sesi Terintegrasi (SessionsCalendarView.tsx)
- **Tiga Mode Tampilan (Day / Week / Month):**
  - **Tampilan Hari (Day):** Timeline per jam dari jam 06:00 hingga 21:00 dengan alokasi slot sesi per member, lokasi lantai gym, dan fokus latihan.
  - **Tampilan Minggu (Week):** Grid 7 hari yang memperlihatkan distribusi sesi dalam seminggu, status konfirmasi, dan tingkat kesibukan pelatih.
  - **Tampilan Bulan (Month):** Kalender matriks bulanan dengan dot indikator jumlah sesi harian dan ringkasan jadwal hari terpilih.
- **Filter Lokasi:** Semua Lokasi, Gym Utama Senayan, SCBD District 8, Private Studio Kemang.
- **Aksi Cepat Jadwal:** Konfirmasi sesi, reschedule sesi via modal interaktif, atau navigasi langsung ke profil member terkait.

### Modul 8: Profil & Portofolio Coach Panji (CoachProfileView.tsx)
- **Kredensial & Lisensi:** Nomor Registrasi Kemenpora RI, Lisensi PB PABSI, CSCS, dan sertifikasi nutrisi kebugaran terverifikasi.
- **Manajemen Beban Kerja:** Indikator visual utilisasi kuota (contoh: 24/27 slot terisi = 89%), tombol toggle buka/tutup kuota member baru.
- **Keamanan & Sinkronisasi:** Modal konfirmasi keluar akun dengan visual check integritas enkripsi cache lokal sebelum kembali ke LoginScreen.

---

## 5. Model Data & Skema Entitas

### 5.1 Entitas Member (`ClientProfile`)
```typescript
interface ClientProfile {
  id: string;                      // ID unik internal (cth: "k-01")
  code: string;                    // Nomor registrasi (cth: "#KLN-2026-081")
  nama_lengkap: string;            // Nama member
  gender: 'Pria' | 'Wanita';
  usia: number;
  pekerjaan: string;
  telepon: string;                 // Format internasional "628..."
  target_utama: string;            // Ringkasan target (cth: "Fat Loss -5.0kg")
  target_category: 'Fat Loss' | 'Hipertrofi' | 'Powerlifting';
  phase: string;                   // Fase periodisasi (cth: "Hypertrophy Mesocycle II")
  status: 'Aktif' | 'Cuti';
  initials: string;                // 2 huruf inisial
  avatarBg: string;                // Kelas gradient Tailwind
  paketTotal: number;              // Total sesi PT yang dibeli (12/24/36)
  paketTerpakai: number;           // Jumlah sesi yang sudah diselesaikan
  dietCompliancePct: number;       // Skor kepatuhan diet (%)
  leadCoach: string;               // "Panji Akbar Syamsi"
  
  // Antropometri & Komposisi Tubuh
  berat_awal_kg: number;
  berat_terkini_kg: number;
  berat_target_kg: number;
  body_fat_awal_pct: number;
  body_fat_terkini_pct: number;
  massa_otot_awal_kg: number;
  massa_otot_terkini_kg: number;
  lingkar_pinggang_awal_cm: number;
  lingkar_pinggang_terkini_cm: number;
  lingkar_dada_awal_cm: number;
  lingkar_dada_terkini_cm: number;
  lingkar_lengan_awal_cm: number;
  lingkar_lengan_terkini_cm: number;
  visceralFatScore: number;

  // Nutrisi & Hidrasi Target
  kaloriHarian: number;
  kaloriTarget: number;
  proteinHarian: number;
  proteinTarget: number;
  karboTarget?: number;
  lemakTarget?: number;
  hidrasiLiter: number;
  hidrasiTarget: number;
  weeklyNutritionDays: ('tercapai' | 'kurang' | 'belum')[];
  nutritionCoachNote: string;
  dietDetailNote?: string;

  // Screening Medis & Postur
  medicalHistoryNote?: string;
  postureScreeningNote?: string;

  // Referensi Awal
  baselinePhotoUrl?: string;
  baselinePhotoPose?: string;
  baselinePhotoDate?: string;

  // Sesi & Relasi
  nextSession: ScheduledSession;
  sesi_terakhir: string;
  weeklyTrend: WeeklyMetricPoint[];
  prList: PRRecord[];
  sessions: SessionRecord[];
  photos: ProgressPhoto[];
}
```

### 5.2 Entitas Profil Pelatih (`CoachProfileData`)
```typescript
interface CoachProfileData {
  id: string;
  name: string;                    // "Coach Panji Akbar Syamsi"
  initials: string;                // "PAS"
  roleTitle: string;               // "Head Coach & Master Fitness Trainer"
  kemenporaId: string;
  pabsiLicense: string;
  experienceYears: number;
  specialization: string;
  primaryLocation: string;         // "Gym Utama Senayan"
  secondaryLocation: string;       // "SCBD District 8"
  email: string;
  whatsapp: string;
  maxClientQuota: number;          // Kapasitas maksimal (cth: 27)
  acceptingNewClients: boolean;
  certifications: CoachCertification[];
}
```

---

## 6. Persyaratan Non-Fungsional & Kompatibilitas
1. **Penyimpanan Lokal Persisten:** Seluruh perubahan profil member, kalibrasi metrik, logging sesi latihan, dan foto fisik disimpan ke `localStorage` dengan penanganan migrasi otomatis.
2. **Kinerja & Responsivitas:**
   - Tidak ada ketergantungan API pihak ketiga yang memblokir render offline.
   - Waktu buka awal < 800ms.
   - Target sentuh minimal 44x44px untuk kenyamanan operasional dengan jempol saat beraktivitas di gym.
3. **Ergonomi UI Mengambang (Floating Action):**
   - Tombol floating navigasi berbentuk lingkaran sempurna (`w-14 h-14 rounded-full`) diletakkan di pojok kanan bawah (`bottom-6 right-5`).
   - Tidak menutupi elemen interaktif karena container utama dilengkapi `pb-28` (padding bawah 112px).
   - Tombol mengambang otomatis disembunyikan (`opacity-0 pointer-events-none`) saat ada modal aktif (`z-50`).
