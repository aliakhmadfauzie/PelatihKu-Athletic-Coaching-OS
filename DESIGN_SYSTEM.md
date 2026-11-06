# PelatihKu PRO — Design System Specification
**Athletic Coaching Operating System**  
**Version:** 1.0.0 | **Framework:** Material 3 & High-Contrast OLED Dark Theme  
**Lead Coach:** Panji Akbar Syamsi, S.Or. (Master Fitness Trainer)

---

## 1. Overview & Philosophy

The **PelatihKu PRO Design System** is an athletic, mobile-first design system engineered for high-performance Personal Trainers and Head Coaches operating in fast-paced, high-glare fitness center environments.

### Core Principles
1. **OLED Battery Efficiency & High Glare Contrast:**
   - Deep obsidian background (`#0B0F17`) saves battery on mobile AMOLED displays during 12+ hour gym shifts.
   - High-contrast emerald accents (`#10B981`) and gold trophies (`#FFB95F`) ensure readability under fluorescent gym spotlights.
2. **One-Handed Ergonomics (Gym Floor Rule):**
   - Every interactive element guarantees a **48dp minimum touch target** (`min-height: 48px`, `min-width: 48px`).
   - Floating Action Buttons (FAB) are anchored in the primary thumb zone (`bottom-6 right-5`).
3. **Glassmorphic Spatial Hierarchy:**
   - Layered elevation using backdrop blur (`backdrop-filter: blur(16px)`) and 1px hairline borders (`rgba(255, 255, 255, 0.08)`).
4. **WCAG 2.1 AA Accessibility:**
   - High contrast text scales ($\ge 4.5:1$).
   - Explicit `role`, `aria-label`, `aria-modal`, and keyboard navigation support (`Escape` modal dismissal).

---

## 2. Design Tokens Catalog

Defined in [`src/design-system/tokens.ts`](file:///c:/Users/AL_AAF/Project/Pelatihku/PelatihKu-Athletic-Coaching-OS/src/design-system/tokens.ts) and mirrored in [`src/index.css`](file:///c:/Users/AL_AAF/Project/Pelatihku/PelatihKu-Athletic-Coaching-OS/src/index.css).

### 2.1 Colors

| Token Name | Value | Purpose |
|---|---|---|
| `colors.background` | `#0B0F17` | Deep obsidian root background |
| `colors.backgroundElevated` | `#111726` | Card and modal base surface |
| `colors.backgroundSubtle` | `#141B28` | Inner nested container background |
| `colors.primary.DEFAULT` | `#10B981` | Brand primary emerald (buttons, active states) |
| `colors.primary.hover` | `#059669` | Interactive hover state |
| `colors.primary.surface` | `rgba(16, 185, 129, 0.12)` | Subtle pill and badge background |
| `colors.primary.textOnPrimary`| `#002113` | Text on solid emerald buttons |
| `colors.secondary.cyan` | `#06B6D4` | Hydration and aerobic indicators |
| `colors.secondary.amber` | `#F59E0B` | Warning, moderate RPE (7-8), pending |
| `colors.secondary.rose` | `#EF4444` | High DOMS, cancel, destructive actions |
| `colors.secondary.gold` | `#FFB95F` | Personal Record (PR) trophy badges |
| `colors.border.hairline` | `rgba(255, 255, 255, 0.08)` | Standard card and list separator |

### 2.2 Glassmorphism Elevation Levels

| Level | CSS Class | Backdrop Blur | Background Opacity |
|---|---|---|---|
| **Level 1** | `.surface-glass-1` | `blur(12px)` | `rgba(17, 24, 39, 0.65)` |
| **Level 2** | `.surface-glass-2` | `blur(16px)` | `rgba(20, 27, 43, 0.82)` |
| **Modal** | `.surface-glass-modal`| `blur(24px)` | `rgba(16, 23, 38, 0.94)` |

### 2.3 Typography

- **Sans Font:** `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- **Mono / Tabular Font:** `'JetBrains Mono', monospace` (used for all numeric metrics, weights, reps, and RPE).

---

## 3. Component Architecture & APIs

All components are located in [`src/components/ui/`](file:///c:/Users/AL_AAF/Project/Pelatihku/PelatihKu-Athletic-Coaching-OS/src/components/ui/) and exported via `index.ts`.

### 3.1 Button Component ([`Button.tsx`](file:///c:/Users/AL_AAF/Project/Pelatihku/PelatihKu-Athletic-Coaching-OS/src/components/ui/Button.tsx))

Accessible button with built-in 48px touch targets, loading states, and haptic-style scale feedback.

```tsx
import { Button } from './components/ui';
import { Dumbbell, Plus } from 'lucide-react';

// Primary Action Button (48px height)
<Button
  variant="primary"
  size="md"
  leftIcon={<Dumbbell className="w-4 h-4" />}
  onClick={handleStartWorkout}
>
  Mulai Sesi Latihan
</Button>

// Secondary Outline Button
<Button
  variant="outline"
  size="md"
  leftIcon={<Plus className="w-4 h-4" />}
  onClick={handleAddExercise}
>
  Tambah Gerakan
</Button>

// Loading State (auto-disables & shows spinner)
<Button variant="primary" isLoading={isSubmitting}>
  Menyimpan Data...
</Button>
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'danger' \| 'ghost'` | `'primary'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size scale (`md` = 48px standard touch target) |
| `fullWidth` | `boolean` | `false` | Expand to 100% width |
| `isLoading`| `boolean` | `false` | Displays spinner and disables clicks |
| `leftIcon` | `React.ReactNode` | — | Leading icon |
| `rightIcon`| `React.ReactNode` | — | Trailing icon |

---

### 3.2 Badge Component ([`Badge.tsx`](file:///c:/Users/AL_AAF/Project/Pelatihku/PelatihKu-Athletic-Coaching-OS/src/components/ui/Badge.tsx))

Status pill with optional pulsating live dot.

```tsx
import { Badge } from './components/ui';

// Live Active Member Badge
<Badge variant="emerald" dot pulse>
  Aktif di Gym Floor
</Badge>

// Warning Badge
<Badge variant="amber" dot>
  Sisa 2 Sesi
</Badge>

// PR Trophy Badge
<Badge variant="gold">
  PR +5.0 kg
</Badge>
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'emerald' \| 'amber' \| 'rose' \| 'cyan' \| 'purple' \| 'gold' \| 'neutral'` | `'emerald'` | Color theme |
| `size` | `'sm' \| 'md'` | `'md'` | Badge size scale |
| `dot` | `boolean` | `false` | Renders status dot |
| `pulse` | `boolean` | `false` | Adds pulse animation to dot |

---

### 3.3 GlassCard Component ([`GlassCard.tsx`](file:///c:/Users/AL_AAF/Project/Pelatihku/PelatihKu-Athletic-Coaching-OS/src/components/ui/GlassCard.tsx))

Container with glassmorphic elevation and optional tap feedback.

```tsx
import { GlassCard } from './components/ui';

<GlassCard level={1} interactive glow="emerald" onClick={handleOpenDetail}>
  <h3 className="font-bold text-white">Budi Santoso</h3>
  <p className="text-xs text-neutral-400">Target: Fat Loss -5kg</p>
</GlassCard>
```

---

### 3.4 Input Component ([`Input.tsx`](file:///c:/Users/AL_AAF/Project/Pelatihku/PelatihKu-Athletic-Coaching-OS/src/components/ui/Input.tsx))

High-contrast accessible text and numeric inputs with error states.

```tsx
import { Input } from './components/ui';
import { Search } from 'lucide-react';

<Input
  label="Cari Member PT"
  placeholder="Ketik nama atau nomor WhatsApp..."
  leftIcon={<Search className="w-4 h-4" />}
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  error={searchError}
/>
```

---

### 3.5 Modal Component ([`Modal.tsx`](file:///c:/Users/AL_AAF/Project/Pelatihku/PelatihKu-Athletic-Coaching-OS/src/components/ui/Modal.tsx))

Accessible bottom sheet on mobile and centered dialog on tablet/desktop.

```tsx
import { Modal } from './components/ui';

<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Catat Sesi Latihan Baru"
  subtitle="Member: Budi Santoso (#KLN-2026-081)"
>
  <div className="p-4">
    {/* Form contents */}
  </div>
</Modal>
```

---

### 3.6 BentoCard Component ([`BentoCard.tsx`](file:///c:/Users/AL_AAF/Project/Pelatihku/PelatihKu-Athletic-Coaching-OS/src/components/ui/BentoCard.tsx))

Reusable Executive Dashboard KPI card.

```tsx
import { BentoCard } from './components/ui';
import { Users } from 'lucide-react';

<BentoCard
  label="Total Member Aktif"
  value={24}
  subValue="/ 27 Kuota"
  icon={<Users className="w-4 h-4" />}
  trendText="+3 bln ini"
  trendPositive
  onClick={handleNavigateToDirectory}
/>
```

---

## 4. Accessibility Checklist (WCAG 2.1 AA)

- [x] **Touch Target Size:** Min. 48dp on all interactive elements.
- [x] **Contrast Ratio:** Text on background $\ge 4.5:1$, icons $\ge 3.0:1$.
- [x] **Focus States:** High visibility emerald focus rings (`.focus-ring`).
- [x] **Screen Reader Support:** Accessible labels (`aria-label`, `aria-describedby`, `aria-modal`).
- [x] **Keyboard Navigation:** Native modal dismissal via `Escape` key.

---

*Design System Documented for PelatihKu PRO v2.5.0*
