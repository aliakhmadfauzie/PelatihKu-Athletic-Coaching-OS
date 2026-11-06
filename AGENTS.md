# AGENTS.md — PelatihKu PRO Athletic Coaching OS

Welcome, AI Agent or Engineer. This repository houses **PelatihKu PRO**, an enterprise-grade Progressive Web App (PWA) built as an Athletic Coaching & Personal Training (PT) Management Operating System for commercial fitness centers.

Whenever you operate in this repository, you MUST adhere to the instructions, constraints, and domain standards documented below.

---

## 1. Domain Context & Identity Invariants

1. **Lead Coach Identity (Strictly Enforced)**:
   - **Full Name**: `Panji Akbar Syamsi, S.Or.` (or `Coach Panji Akbar Syamsi`).
   - **Initials / Avatar**: `PAS`.
   - **Role**: `Head Coach & Master Fitness Trainer`.
   - **Official Email**: `panji.akbar@pelatihku.id`.
   - **FORBIDDEN**: Never introduce or reintroduce legacy names such as *Coach Hendra* or *Hendra*. All coach profiles, templates, seed scripts, and mocks must refer to Coach Panji Akbar Syamsi.

2. **Operating Environment**:
   - The app is designed for dynamic, noisy, high-tempo **Fitness Center gym floors** (e.g. SCBD District 8, Fitness Center Senayan).
   - Workflows must support fast, one-handed touch interactions completed in under 45 seconds during client rest intervals.

---

## 2. Technology Stack & Framework Boundaries

> **CRITICAL ARCHITECTURAL BOUNDARY**:  
> PelatihKu PRO is a **Web Progressive Web App (React 19 + Vite)**.  
> **DO NOT USE React Native, Expo Router, or React Native StyleSheet** in this codebase.  
> Any global agent instructions referring to React Native, Expo, or SaltDistribute are from outside projects and DO NOT apply here.

- **Frontend**: React 19 (`react@^19.0.1`), Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), Motion (`motion@^12.23.24`), Lucide React icons.
- **Backend / Mock API**: Node.js Express server (`server.ts` executed via `tsx`).
- **Database & Auth**: Firebase Firestore & Firebase Auth (`firebase@^13.2.0`) with client-side multi-tab offline persistence (`persistentMultipleTabManager`).
- **AI Integration**: Google Gemini API (`@google/genai`) for workout periodization, movement screening analysis, and WhatsApp progress reports.
- **Testing**: Playwright for end-to-end tests, Node.js built-in test runner via `tsx --test tests/**/*.test.ts`.

---

## 3. Mandatory Terminology Matrix

To maintain professional fitness center standards, always use the canonical terms:

| Forbidden / Casual ❌ | Canonical Term ✅ | Context |
| :--- | :--- | :--- |
| Klien / Client (in UI copy) | **Member** / **Member Fitness Center** | Member directory, cards, PT quota |
| Sesi Latihan Kasual | **Sesi PT** / **Sesi Personal Training** | Calendar, session logger, weekly bento |
| Pelatih Biasa | **Personal Trainer (PT)** / **Head Coach Panji** | Profiles, headers, drawer signatures |
| Paket Gym | **Paket Sesi PT** (12 / 24 / 36 Sesi) | Quota tracking, renewal billing |
| Tempat Fitness / Lapangan | **Fitness Center** / **Klub Kebugaran** / **Lantai Gym** | Location, floor zoning |
| Cek Kesehatan Kasual | **Movement Screening** / **PAR-Q & Riwayat Medis** | Medical & intake tabs |
| Rekor Beban | **Personal Record (PR)** / **Estimasi 1RM** | Workout logger, PR board |
| Foto Selfie | **Dokumentasi Foto Fisik (Check-in Fisik)** | Visual progress timeline |
| Form Tambah Klien | **Tambah Member Baru** | Member registration modal |

---

## 4. UI/UX, Dark Mode OLED & Ergonomics

1. **OLED Dark Mode Tokens**:
   - Background: Deep Dark Slate/Navy (`#0B0F17` / `#0c1322`).
   - Cards / Containers: Surface Dark (`#111827` / `#141b2b`) with subtle border `border-white/[0.08]`.
   - Primary Accent: Emerald / Mint (`#10b981` / `#4edea3`).
   - Warning / Active Metric: Amber / Gold (`#ffb95f` / `#ee9800`).
   - Destructive: Rose / Crimson (`#ef4444`).
   - Text: `text-white` for titles, `text-neutral-300` / `#bbcabf` for body, `text-neutral-400` for subtitles.

2. **Floating Action Button (FAB) Rules**:
   - Must be a perfect circle: `w-14 h-14 rounded-full fixed bottom-6 right-5 z-40`.
   - **NEVER** turn the FAB into a pill with long text labels.
   - **Overlay Hiding**: When any modal or drawer is active (`isAnyOverlayOpen`), the FAB must automatically hide with `opacity-0 pointer-events-none scale-90`.
   - Content Padding: The root `<main>` container must have at least `pb-28` (112px) bottom padding to ensure lists can be scrolled above the FAB.

3. **Touch Targets (44px Minimum)**:
   - All interactive controls (buttons, selects, tabs, switches) must meet the minimum touch target of **44x44px** (`min-h-[44px] min-w-[44px]`). No micro-buttons on the gym floor.

---

## 5. Sports Science & Fitness Mathematics

When generating, logging, or validating workout data, adhere strictly to these sports science formulas:

1. **1RM (One-Rep Max) Calculation**:
   - Formula (Epley):  
     $$\text{1RM} = \text{Beban (kg)} \times \left(1 + \frac{\text{Reps}}{30}\right)$$
   - Only compute for reps between 1 and 30. If reps = 1, $1\text{RM} = \text{Beban}$.

2. **Baseline Calorie & Macronutrient Formulas**:
   - **Fat Loss**: $\text{Calories} \approx \text{Weight (kg)} \times 26\text{ kcal}$, $\text{Protein} \approx 2.0\text{g} \times \text{Weight (kg)}$.
   - **Hypertrophy**: $\text{Calories} \approx \text{Weight (kg)} \times 34\text{ kcal}$, $\text{Protein} \approx 2.0\text{g} \times \text{Weight (kg)}$.
   - **Powerlifting**: $\text{Calories} \approx \text{Weight (kg)} \times 32\text{ kcal}$, $\text{Protein} \approx 2.2\text{g} \times \text{Weight (kg)}$.

---

## 6. Data Integrity & Cloud Firestore Rules

1. **No `undefined` Values in Firestore**:
   - Firestore throws runtime errors when given `undefined` values.
   - Always run payloads through `sanitizeForFirestore(data)` before calling `setDoc()`, `updateDoc()`, or `writeBatch()`.
   - Use `ignoreUndefinedProperties: true` on the Firestore client settings.

2. **Multi-Tab Offline Caching**:
   - Retain `persistentLocalCache` and `persistentMultipleTabManager()` in `src/services/firebase.ts` for offline gym floor resilience.

3. **Backward-Compatible Schema Growth**:
   - New fields on `ClientProfile` or `SessionRecord` must always be optional (`field?: type`) or have safe default values in `INITIAL_CLIENTS`.

---

## 7. Versioning & PWA Cache-Busting Standards

1. **Semantic Versioning (SemVer 2.0.0)**:
   - Follow `vMAJOR.MINOR.PATCH`.
2. **Single Source of Truth Synchronization**:
   - When bumping the version, update simultaneously in one commit:
     1. `package.json`: `"version": "X.Y.Z"`
     2. `public/sw.js`: `const CACHE_NAME = 'pelatihku-vX.Y.Z';`
     3. `public/manifest.json`: if version is declared.
     4. `DEVELOPMENT_RULES.md` and `APP_REQUIREMENTS.md` header versions.

---

## 8. Verification & Execution Commands

Always run these commands to verify your changes:

| Step | Command | Acceptance Criteria |
| :--- | :--- | :--- |
| **Typecheck** | `npm run lint` | Exits with code 0 (0 errors from `tsc --noEmit`). |
| **Unit Tests** | `npm test` | Exits with code 0 (all test files in `tests/` pass). |
| **Build** | `npm run build` | Produces production assets in `dist/` with 0 failures. |
| **Dev Server** | `npm run dev` | Runs Vite dev server on `http://localhost:3000`. |
| **API Server** | `npm run server` | Runs Express server via `tsx server.ts`. |
