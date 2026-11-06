---
title: PelatihKu PRO Core Architecture & Domain Standards
trigger: model_decision
description: "Core architectural standards, tech stack specifications, coach identity invariants, sports science calculations, and UI/UX guidelines for PelatihKu PRO."
always_on: true
---

# PelatihKu PRO Core Architecture & Domain Standards

This rule establishes mandatory standards for development, code modification, and testing within PelatihKu PRO.

---

## 1. Stack Specification & Technology Boundaries

- **Stack**: Modern Web Progressive Web App (React 19, Vite, Tailwind CSS v4, TypeScript 7, Express `server.ts`, Firebase Firestore/Auth).
- **STACK OVERRIDE**: This repository is a **Web PWA**, NOT React Native or Expo Router. Any global instructions regarding `react-native`, `StyleSheet.create`, or Expo Router (`app/` routing) are strictly superseded by this rule and MUST NOT be used here.

---

## 2. Lead Coach Identity Invariant

- **Official Name**: `Panji Akbar Syamsi, S.Or.` or `Coach Panji Akbar Syamsi`.
- **Initials / Avatar**: `PAS`.
- **Title**: `Head Coach & Master Fitness Trainer`.
- **Email**: `panji.akbar@pelatihku.id`.
- **PROHIBITION**: Legacy references (such as "Coach Hendra") are strictly forbidden. Any component, test, mock, or prompt must use Panji Akbar Syamsi.

---

## 3. UI/UX, Dark Mode OLED & Ergonomics

1. **Color Tokens**:
   - Background: OLED Black/Dark Slate `#0B0F17`.
   - Card Surfaces: `#111827` / `#141b2b` with `border-white/[0.08]`.
   - Accent: Emerald `#10b981` / `#4edea3`.
   - Warning: Amber `#ffb95f` / `#ee9800`.
   - Danger: Rose `#ef4444`.
2. **Floating Action Button (FAB)**:
   - Must be a perfect circle (`w-14 h-14 rounded-full fixed bottom-6 right-5 z-40`).
   - Automatically hidden (`opacity-0 pointer-events-none scale-90`) when any modal/drawer is open (`isAnyOverlayOpen`).
   - Container `<main>` must retain at least `pb-28` bottom padding.
3. **Touch Targets**:
   - Minimum 44x44px (`min-h-[44px] min-w-[44px]`) touch targets for all interactive controls.

---

## 4. Sports Science & Fitness Mathematics

1. **1RM (One-Rep Max) Calculation**:
   - Epley Formula: $\text{1RM} = \text{Beban} \times \left(1 + \frac{\text{Reps}}{30}\right)$ for reps $\in [1, 30]$.
2. **Calorie & Protein Baselines**:
   - Fat Loss: $\approx \text{Weight} \times 26\text{ kcal}$, Protein $\approx 2.0\text{g} \times \text{Weight}$.
   - Hypertrophy: $\approx \text{Weight} \times 34\text{ kcal}$, Protein $\approx 2.0\text{g} \times \text{Weight}$.
   - Powerlifting: $\approx \text{Weight} \times 32\text{ kcal}$, Protein $\approx 2.2\text{g} \times \text{Weight}$.

---

## 5. Cloud Firestore Data Safety & PWA Resilience

1. **Firestore Sanitization**:
   - Never write `undefined` fields to Firestore; use `sanitizeForFirestore()`.
   - Retain `ignoreUndefinedProperties: true` and `persistentMultipleTabManager()`.
2. **PWA Cache Lifecycle**:
   - Cache bucket naming in `public/sw.js` must mirror `package.json` SemVer (`pelatihku-vX.Y.Z`).

---

## 6. Verification Protocol

Before completing any task, ensure:
1. `npm run lint` (`tsc --noEmit`) passes with 0 errors.
2. `npm test` passes all tests.
3. `npm run build` generates `dist/` cleanly.
