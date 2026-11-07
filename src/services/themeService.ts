/**
 * PelatihKu PRO — Theme Management Service (Light & Dark OLED Mode)
 * Reference Pattern: Jastip-Cross-Border-Manager (src/store/useAppStore.ts & src/index.css)
 * 
 * Supports:
 * - OLED Deep Dark (#0B0F17) for Gym Floor low-glare & battery saving
 * - Clean Daylight Light Mode (#F8FAFC / #FFFFFF) for high ambient daylight reading
 * - System Preference detection (prefers-color-scheme)
 * - Persistent local storage ('pelatihku_theme')
 * - Instant DOM synchronization with data-theme & theme-color meta tag
 */

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'pelatihku_theme';

export const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') {
      applyThemeToDOM(saved);
      return saved;
    }
    // Default to dark mode for athletic OS gym-floor aesthetics, but check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      applyThemeToDOM('light');
      return 'light';
    }
  } catch {
    // Fallback if storage access is restricted
  }
  applyThemeToDOM('dark');
  return 'dark';
};

export const applyThemeToDOM = (theme: ThemeMode) => {
  if (typeof window === 'undefined') return;
  try {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#0B0F17');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#F8FAFC');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors in restrictive modes
  }
};
