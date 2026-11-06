# Repository Agent Enhancement for PelatihKu PRO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish high-craft agent customizations tailored to PelatihKu PRO: repository-level agent instruction (`AGENTS.md`), project rules (`.gemini/rules/pelatihku-core-standards.md`), specialized subagent (`pelatihku-athletic-os-engineer`), automated domain invariants test suite (`tests/domain-invariants.test.ts`), and baseline compile hygiene.

**Architecture:** Configure hierarchical Antigravity customizations (`AGENTS.md` and `.gemini/rules/` to override conflicting global React Native rules), define a domain-aware subagent (`pelatihku-athletic-os-engineer`) equipped with sports science formulas, gym-floor PWA resilience, and strict coach identity, and establish automated invariant testing for continuous regression prevention.

**Tech Stack:** Antigravity Agent Configuration (`AGENTS.md`, Gemini Rules, Agent Markdown specs), TypeScript 7, React 19, Vite, Tailwind CSS v4, Node.js Test Runner (`tsx --test`).

**Spec:** `APP_REQUIREMENTS.md`, `DEVELOPMENT_RULES.md`, `SYSTEM_DESIGN.md`

## Global Constraints
- Lead Coach Identity must strictly be **Panji Akbar Syamsi, S.Or.** (initials: `PAS`, email: `panji.akbar@pelatihku.id`); Coach Hendra is strictly forbidden.
- Target stack is **React 19 + Vite + Tailwind CSS v4 + Express + Firebase Firestore/Auth Web PWA**; any React Native or Expo Router rules must be explicitly overridden.
- Sports science formulas: Epley 1RM ($\text{Weight} \times (1 + \frac{\text{Reps}}{30})$), calorie baseline (Fat loss: $\approx 26 \times \text{kg}$, Hypertrophy: $\approx 34 \times \text{kg}$, Powerlifting: $\approx 32 \times \text{kg}$) and macronutrient ratios must be enforced.
- Zero TypeScript compile errors (`npm run lint` / `tsc --noEmit` must pass with 0 errors).
- All tests must pass cleanly (`npm test`).

## Review Focus
- **Contradictory global rules:** Preempt global React Native/Expo rules by explicitly defining web React 19, Tailwind CSS v4, and browser PWA standards.
- **Coach identity leaks:** Prevent regression where legacy trainer names slip into new components, tests, or seed scripts.
- **Firestore undefined property crashes:** Enforce data sanitization before Firestore `setDoc`/`updateDoc` writes.
- **Touch target accessibility:** Enforce 44x44px minimum touch targets and circular FAB button rules (`w-14 h-14 rounded-full`, hidden when modal is open).
- **SemVer and PWA cache synchronization:** Ensure `package.json`, `public/sw.js`, and `public/manifest.json` versions remain synchronized.

---

### Task 1: Fix Baseline TypeScript Compile Error in ClientDetailView

**Files:**
- Modify: `src/components/ClientDetailView.tsx:40-56`
- Test: `npm run lint`

**Interfaces:**
- Consumes: `getClientPin` from `../services/authGatekeeperService`
- Produces: Clean TypeScript build without duplicate identifier errors

- [ ] **Step 1: Inspect duplicate import in `src/components/ClientDetailView.tsx`**
- [ ] **Step 2: Remove duplicate `getClientPin` from line 40 while retaining `mustChangeClientPin`**
- [ ] **Step 3: Run `npm run lint` to verify clean compilation with 0 errors**

---

### Task 2: Create Repository Agent Instruction (`AGENTS.md`)

**Files:**
- Create: `AGENTS.md`
- Reference: `DEVELOPMENT_RULES.md`, `APP_REQUIREMENTS.md`, `SYSTEM_DESIGN.md`

**Interfaces:**
- Consumes: Repository specifications and development guidelines
- Produces: Primary root agent instructions loaded by any Antigravity/Gemini agent in this repository

- [ ] **Step 1: Draft `AGENTS.md` with identity constraints, technology stack disambiguation (Web React 19 PWA vs React Native), terminology matrix, UI/UX OLED standards, sports science formulas, and verification gates**
- [ ] **Step 2: Verify `AGENTS.md` covers all critical invariants from `DEVELOPMENT_RULES.md` and `APP_REQUIREMENTS.md`**

---

### Task 3: Create Workspace Rule (`.gemini/rules/pelatihku-core-standards.md`)

**Files:**
- Create: `.gemini/rules/pelatihku-core-standards.md`
- Reference: `.gemini/rules/versioning-standards.md`

**Interfaces:**
- Consumes: Antigravity rules format (`trigger: model_decision`, `always_on: true`)
- Produces: Persistent project rule taking precedence over global machine rules

- [ ] **Step 1: Write `.gemini/rules/pelatihku-core-standards.md` with `always_on: true`**
- [ ] **Step 2: Explicitly declare the React 19 + Tailwind v4 + Express + Firebase stack to override global React Native rules**
- [ ] **Step 3: Mandate Firestore sanitization (`ignoreUndefinedProperties`, no `undefined` writes) and PWA cache lifecycle rules**

---

### Task 4: Define Dedicated Subagent (`pelatihku-athletic-os-engineer`)

**Files:**
- Create: `.gemini/agents/pelatihku-athletic-os-engineer.md`
- Create: `C:\Users\AL_AAF\.gemini\config\agents\pelatihku-athletic-os-engineer.md`

**Interfaces:**
- Consumes: Antigravity agent definition schema (`name`, `description`, `tools`, `subagent`, `model`)
- Produces: Dedicated Athletic Coaching OS engineering subagent available for delegation

- [ ] **Step 1: Structure agent definition with tools (`view_file`, `replace_file_content`, `grep_search`, `file_search`, `run_command`) and specialized domain role**
- [ ] **Step 2: Add sports science calculation guidelines, gym-floor offline PWA tolerance protocols, and Playwright verification instructions**
- [ ] **Step 3: Save agent definition in both repository `.gemini/agents/` and global config `~/.gemini/config/agents/`**

---

### Task 5: Create Automated Domain Invariants Test Suite

**Files:**
- Create: `tests/domain-invariants.test.ts`
- Test: `npm test`

**Interfaces:**
- Consumes: `package.json`, `public/sw.js`, `src/data/mockData.ts`, `DEVELOPMENT_RULES.md`
- Produces: Automated test suite ensuring coach identity, sports science math, and SemVer synchronization never regress

- [ ] **Step 1: Write test for Coach Identity invariant (Lead Coach Panji Akbar Syamsi / PAS, 0 occurrences of Coach Hendra in mock data and active docs)**
- [ ] **Step 2: Write test for Sports Science formulas (Epley 1RM formula, calorie & protein multiplier assertions)**
- [ ] **Step 3: Write test for SemVer synchronization (verifying `package.json` version matches `public/sw.js` cache name)**
- [ ] **Step 4: Run `npm test` to verify all domain invariants pass**
