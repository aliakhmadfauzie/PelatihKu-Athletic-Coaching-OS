# Target Objective
Conduct a comprehensive, professional UI/UX, mobile ergonomics, and data integrity audit and overhaul for the PelatihKu PRO screens, starting with:
1. **Screen 1: Login & Authentication Screen** (`src/components/LoginScreen.tsx`)
2. **Screen 2: Executive Dashboard** (`src/App.tsx`) from the perspective of both **Coach/Admin** and **Member/Client**.

Eliminate all hardcoded values, apply authentic iOS translucent RGBA glassmorphic styling, ensure mobile-first touch optimization (>=44px targets, safe-area insets, 100dvh resilience), fix all button actions, and elevate the aesthetic to meet the 15+ years experienced Apple iOS Human Interface Guidelines (HIG) standard (>4.5 stars rating).

---

# Discovered Repository Context
- **Stack**: React 19, Vite, Tailwind CSS v4, Lucide React icons, TypeScript 7, Express `server.ts`, Node.js built-in test runner (`tsx --test`).
- **Core Invariants & Standards**:
  - Lead Coach Identity: `Panji Akbar Syamsi, S.Or.` (`PAS`, `panji.akbar@pelatihku.id`). Legacy name "Coach Hendra" is strictly forbidden.
  - Terminology: `Member`, `Sesi PT`, `Personal Trainer (PT)`, `Fitness Center`, `Movement Screening`.
  - Color Tokens: Deep OLED `#0B0F17`, Emerald `#10b981`, Amber `#ffb95f`, Blue `#3b82f6`, Rose `#ef4444`.
- **Impacted Files**:
  - `src/components/LoginScreen.tsx`: Complete mobile & iOS HIG overhaul, RGBA layering, dynamic version, 1-tap test credentials bar, biometric sensory feedback, 44px touch targets.
  - `src/App.tsx`: Header and Dashboard review for Coach/Admin and Client perspectives, purge hardcoded stats (e.g. static drawer count `24`, fallback PR `115kg`), apply iOS translucent dock and card styling, safe-area insets (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`), and seamless quick-role preview.
  - `tests/domain-invariants.test.ts`: Ensure all domain invariant and calculation tests continue to pass with 0 errors.

---

# Required Skills & Slash Commands
- **Domain Skills**: `ui-ux-anti-slop`, `ui-audit`, `component-crafting`, `frontend-design-system`
- **Recommended Slash Commands**: `/ui-audit`, `/ui-ux-anti-slop`, `/plan`
- **Execution Mode**: Standard / Thorough Autonomous Execution

---

# Functional Specifications & Acceptance Criteria

### 1. Mobile Optimization & Ergonomics
- Use `min-h-[100dvh]` to prevent viewport snapping on iOS Safari and mobile Chrome address bar toggle.
- Integrate iOS Safe Area insets: `pt-[env(safe-area-inset-top,0.75rem)]` and `pb-[env(safe-area-inset-bottom,1rem)]`.
- All interactive controls (buttons, inputs, tab items, dropdowns) must strictly meet the **44x44px minimum touch target** (`min-h-[44px] min-w-[44px]`).
- Mobile momentum scrolling with `-webkit-overflow-scrolling: touch` and `no-scrollbar` styling for clean horizontal pill filters.

### 2. Accurate Dynamic Information (Zero Hardcoded Slop)
- Replace hardcoded drawer member count (`24`) with dynamic `clients.length`.
- Replace hardcoded PR fallbacks (`115kg` / `134kg`) in Member Dashboard Bento with genuine client PR records or graceful empty states.
- Dynamic version display referencing project version rather than stale text.
- Provide a high-utility 1-tap credential switcher on the Login Screen (`[Coach Panji: 123456]`, `[Member Budi: 34567801]`, `[Admin: 999888]`) allowing immediate frictionless testing across all 3 roles.

### 3. RGBA Translucency & Glassmorphic Elevation
- Implement Apple HIG dark-mode layered materials:
  - Base background: `#0B0F17` OLED matte black.
  - Card Surfaces: `rgba(17, 24, 39, 0.72)` with `backdrop-blur-2xl`.
  - Borders: `1px solid rgba(255, 255, 255, 0.08)` hairline border with subtle top inset highlight `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]`.
  - Inset inputs: `rgba(0, 0, 0, 0.45)` with `rgba(255, 255, 255, 0.1)` border.
  - Floating Bottom Dock: `rgba(15, 23, 42, 0.82)` with `backdrop-blur-2xl` and `shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)]`.

### 4. iOS 15+ Years Senior Design Craft
- Tactile feedback: `active:scale-[0.97]` spring transitions on buttons and clickable Bento cards.
- Segmented control: iOS capsule-style segmented tab with smooth visual transition and clear active states.
- Clear typographic hierarchy: San Francisco-inspired crisp tracking, uppercase subheaders with tracking-wider, `font-mono` for digits, weight contrast between titles (`font-bold text-white`) and descriptions (`text-neutral-400`).
- Dashboard Dual-Perspective Excellence:
  - **Coach/Admin View**: Executive KPIs (Active Members, Weekly Sessions progress bar, Target Achieved, Session Compliance graph), Member Directory with instant search and status filters, Today's Live Schedule feed.
  - **Client/Member View**: Personal Athletic Cockpit, Session Quota remaining gauge, Upcoming Next Session pill with location & time, Nutrition Compliance streak, Personal Best (PR) showcase, and PIN Security card.

---

# Non-Functional & Negative Constraints
- Zero `any` casts in TypeScript; compile check `npm run lint` must exit with 0 errors.
- Never use generic neon radial gradients or purple AI slop.
- Maintain backward compatibility of all handlers and props.
- All existing tests in `npm test` must pass 100%.

---

# Execution Deliverables
1. Enhanced `src/components/LoginScreen.tsx` with iOS HIG ergonomics, RGBA translucency, and 1-tap role access.
2. Enhanced `src/App.tsx` with dynamic calculations, iOS safe-area insets, refined RGBA dock & cards, and dual-perspective polish.
3. Automated verification via `npm run lint` and `npm test`.
4. Detailed audit report for Login and Dashboard screens with proposed roadmap for remaining screens.
