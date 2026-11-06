/**
 * PelatihKu PRO — Design System Tokens
 * Master Theme Tokens conforming to Material 3 & OLED High-Contrast Athletic Dark Mode
 */

export const tokens = {
  // 1. Color Palette (Obsidian + Emerald Glow)
  colors: {
    // Core Backgrounds
    background: '#0B0F17',
    backgroundElevated: '#111726',
    backgroundSubtle: '#141B28',
    
    // Emerald Primary Brand Tokens (M3 & PAS Branding)
    primary: {
      DEFAULT: '#10B981',       // Emerald 500
      hover: '#059669',         // Emerald 600
      active: '#047857',        // Emerald 700
      container: '#006C4C',      // Deep athletic green container
      surface: 'rgba(16, 185, 129, 0.12)',
      textOnPrimary: '#002113',  // High contrast on bright emerald
      glow: 'rgba(16, 185, 129, 0.25)'
    },

    // Secondary / Accent Colors
    secondary: {
      cyan: '#06B6D4',          // Energy / Water hydration
      amber: '#F59E0B',         // Warning / Alert / Moderate RPE
      amberGlow: 'rgba(245, 158, 11, 0.20)',
      rose: '#EF4444',          // Danger / High DOMS / Cancel
      purple: '#8B5CF6',        // Peak Strength / Powerlifting
      gold: '#FFB95F'           // PR Gold Trophy
    },

    // Neutral & Text Scales
    text: {
      primary: '#F8FAFC',       // Slate 50
      secondary: '#CBD5E1',     // Slate 300
      muted: '#94A3B8',         // Slate 400
      disabled: '#64748B',      // Slate 500
      inverse: '#0F172A'
    },

    // Borders & Dividers
    border: {
      hairline: 'rgba(255, 255, 255, 0.08)',
      subtle: 'rgba(255, 255, 255, 0.05)',
      medium: 'rgba(255, 255, 255, 0.14)',
      focus: '#10B981',
      danger: 'rgba(239, 68, 68, 0.4)'
    },

    // Glassmorphic Layer Backgrounds
    glass: {
      level1: 'rgba(17, 24, 39, 0.65)',
      level2: 'rgba(20, 27, 40, 0.80)',
      level3: 'rgba(25, 33, 49, 0.92)',
      backdrop: 'rgba(7, 14, 29, 0.85)'
    }
  },

  // 2. Typography Rhythm
  typography: {
    fonts: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', monospace"
    },
    sizes: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem'  // 30px
    },
    lineHeights: {
      tight: '1.15',
      normal: '1.45',
      relaxed: '1.65'
    }
  },

  // 3. Spacing & Touch Ergonomics
  spacing: {
    touchTargetMin: '48px', // WCAG 2.1 AA & Gym floor 1-hand rule
    fabSize: '56px',        // Standard 56dp FAB
    containerPad: '1rem',   // 16px
    bottomNavPad: '7rem'    // 112px bottom clearance
  },

  // 4. Border Radii
  radii: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px'
  },

  // 5. Shadows & Ambient Lighting
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
    glowPrimary: '0 0 24px -4px rgba(16, 185, 129, 0.25)',
    glowGold: '0 0 24px -4px rgba(255, 185, 95, 0.25)'
  },

  // 6. Transitions & Motion Timing
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '400ms cubic-bezier(0.175, 0.885, 0.32, 1.15)'
  }
} as const;

export type DesignTokens = typeof tokens;
