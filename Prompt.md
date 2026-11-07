# Target Objective
Implement the comprehensive Gym Floor & Strength Coach enhancements identified in the Coach Panji audit for **PelatihKu PRO**:
1. Transform workout logging (`LogSessionModal.tsx`) from a passive keyboard-dependent form into an elite, one-handed, 5-second gym floor logging engine operable with sweaty, chalk-dusted fingers.
2. Eliminate all resistance training primitives gaps: Barbell Plate Math Calculator, Quick-Incremental Steppers (`+2.5`, `+5`, `+10` kg & `+1`, `-1` reps), Previous Session Ghost Watermarks, Automatic Rest Timer Triggers, Instant Exercise Swap (*Ganti Gerakan Setara*), and Unilateral (L/R) tracking.
3. Enforce strict standards from `/visual-hierarchy-auditor` (5/5 visual hierarchy, high contrast under gym glare, clear typographic scale), `/screen-layout-auditor` (minimum 48×48dp hit targets, zero label truncation, zero overlapping buttons), and `/firestore-data-architect` (atomic Firestore persistence, offline resilience, and zero `undefined` values).

---

# Discovered Repository Context
- **Stack**: React 19 (`react@^19.0.1`), Vite 8, Tailwind CSS v4, Motion (Framer), Lucide React icons, TypeScript, Cloud Firestore (`firebase@^13.2.0`).
- **Core Files Impacted**:
  - `src/components/LogSessionModal.tsx`: Main workout set-by-set logger, rest timer, RPE selector, and AI assistant.
  - `src/components/BarbellPlateCalculatorModal.tsx`: NEW dedicated Barbell Plate & Collar Math calculator.
  - `src/components/ExerciseSwapModal.tsx`: NEW smart biomechanical exercise substitution matrix.
  - `src/data/mockData.ts`: Schema extensions for `SetLog` (unilateral tracking, ghost placeholders) and `ExerciseLog`.
  - `src/services/sportsScienceDomain.ts`: Barbell plate breakdown algorithm and previous session ghost values extractor.
  - `src/services/firestoreService.ts`: Real-time persistence and sanitization.
- **Domain Invariants**:
  - Lead Coach Identity: `Panji Akbar Syamsi, S.Or.` (`PAS`).
  - Strict Terminology: `Member`, `Sesi PT`, `Personal Trainer (PT)`, `Fitness Center`, `Estimasi 1RM`.
  - Offline Resilience: Persistent cache and zero `undefined` values written to Firestore.

---

# Required Skills & Slash Commands
- **Domain Skills**: `visual-hierarchy-auditor`, `screen-layout-auditor`, `firestore-data-architect`, `test-driven-development`, `test-automator`
- **Slash Commands**: `/visual-hierarchy-auditor`, `/screen-layout-auditor`, `/firestore-data-architect`
- **Execution Mode**: Complete End-to-End Implementation & Full Automated Verification

---

# Functional Specifications & Acceptance Criteria

### 1. Gym-Floor Quick Incremental Steppers & Sweaty-Finger Touch Targets
- In `LogSessionModal.tsx`, replace the small 40px text inputs with high-contrast, thumb-friendly numeric controls with minimum **48×48dp touch targets**.
- For Weight (`weightKg`): Provide quick one-tap stepper chips `[-2.5]`, `[+2.5]`, `[+5]`, `[+10]` kg and a direct Plate Math Calculator shortcut button.
- For Repetisi (`reps`): Provide quick stepper chips `[-1]` and `[+1]`.
- For Set Actions: Provide a distinct, high-contrast "Centang Set Selesai" button that locks the set and auto-starts the rest timer.
- Target readability: 16px font-mono bold with high contrast (`text-white`, `text-emerald-400`), legible from 1 meter away under gym glare.

### 2. Barbell Plate & Collar Math Calculator (`BarbellPlateCalculatorModal.tsx`)
- Accessible via a barbell icon next to the weight input in `LogSessionModal.tsx`.
- Takes the target load (e.g., 102.5 kg, 127.5 kg, 140 kg).
- Calculates the plate breakdown for a standard 20 kg Olympic barbell (or 15 kg barbell option).
- Displays visual color-coded Olympic bumper plates per side:
  - 25 kg (Red), 20 kg (Blue), 15 kg (Yellow), 10 kg (Green), 5 kg (White), 2.5 kg (Black), 1.25 kg (Chrome).
  - Clear text instruction: *"Pasang per sisi: [20 kg, 20 kg, 1.25 kg]"*.
- One-tap "Gunakan Beban Ini" to apply the rounded load to the active set.

### 3. Automatic Rest Timer Trigger with Floating Visual Countdown
- When a set is marked as finished/logged, the rest timer automatically triggers based on the exercise's `restSeconds` (default 90s, 120s, or 150s).
- Renders a floating, glanceable countdown badge with progress indicator and Web Audio chime when reaching 0.
- Allows 1-tap `+30s` extension or reset directly from the floating widget.

### 4. Previous Session Ghost Watermarks
- In each exercise set row, display the load and reps from the member's previous session (e.g. `[Lalu: 110 kg × 5]`).
- If no previous session data exists, display the planned benchmark target.
- Enables the athlete and coach to immediately apply progressive overload without mental lookup.

### 5. Smart Biomechanical Exercise Substitution Matrix (`ExerciseSwapModal.tsx`)
- When gym equipment is in use, coach can tap "Ganti Gerakan" on the exercise card.
- Presents smart alternatives matching the target muscle group and movement pattern:
  - Squat Pattern: Barbell Back Squat ➔ Leg Press / Hack Squat / Goblet Squat.
  - Hinge Pattern: Conventional Deadlift ➔ Romanian Deadlift / Trap Bar Deadlift.
  - Push Pattern: Barbell Bench Press ➔ Incline Dumbbell Press / Machine Chest Press.
  - Pull Pattern: Pull-Up ➔ Lat Pulldown / Chest-Supported Row.
- Replaces the exercise seamlessly while preserving the completed sets, tempo notes, and workout progress.

### 6. Unilateral Movement Tracking (L/R)
- For exercises classified as unilateral (e.g. *Bulgarian Split Squat*, *Single-Arm DB Row*, *Walking Lunges*), provide a toggle `[Kiri (L)]` and `[Kanan (R)]`.
- Tracks reps and loads per limb to prevent and identify muscular imbalances.

---

# Non-Functional & Negative Constraints
- DO NOT use placeholders (`// TODO`, `...`, or truncated mock implementations).
- DO NOT break existing unit tests in `tests/`.
- Ensure all Firestore payloads pass through `sanitizeForFirestore` with zero `undefined` values.
- Adhere strictly to the Lead Coach invariant: `Panji Akbar Syamsi, S.Or.` (`PAS`).

---

# Execution Deliverables
1. `src/services/sportsScienceDomain.ts`: Plate math calculation helper, previous session ghost value extractor, and exercise substitution map.
2. `src/components/BarbellPlateCalculatorModal.tsx`: Interactive Olympic plate math calculator.
3. `src/components/ExerciseSwapModal.tsx`: Biomechanical equipment substitution modal.
4. `src/components/LogSessionModal.tsx`: Upgraded set logger with 48dp hit targets, quick steppers, auto rest timer trigger, ghost placeholders, and unilateral tracking.
5. `tests/gym-floor-coach-features.test.ts`: Automated test suite verifying plate math, exercise swap, ghost values, and stepper invariants.
6. Verification: `npm run lint` (0 errors), `npm test` (all tests passing), `npm run build` (successful bundle).
