import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getInitialTheme,
  applyThemeToDOM,
  THEME_STORAGE_KEY,
  ThemeMode
} from '../src/services/themeService';

describe('PelatihKu PRO — Light & Dark Mode System Invariants', () => {
  let mockStorage: Record<string, string> = {};
  let classListSet = new Set<string>();
  let attributes: Record<string, string> = {};
  let metaThemeColor = '#0B0F17';

  beforeEach(() => {
    mockStorage = {};
    classListSet = new Set<string>();
    attributes = {};
    metaThemeColor = '#0B0F17';

    // Mock global window & document for Node.js test environment
    (global as any).localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      }
    };

    (global as any).document = {
      documentElement: {
        classList: {
          add: (cls: string) => classListSet.add(cls),
          remove: (cls: string) => classListSet.delete(cls),
          contains: (cls: string) => classListSet.has(cls)
        },
        setAttribute: (key: string, val: string) => {
          attributes[key] = val;
        },
        getAttribute: (key: string) => attributes[key] || null
      },
      querySelector: (selector: string) => {
        if (selector === 'meta[name="theme-color"]') {
          return {
            setAttribute: (_attr: string, val: string) => {
              metaThemeColor = val;
            },
            getAttribute: () => metaThemeColor
          };
        }
        return null;
      }
    };

    (global as any).window = {
      matchMedia: () => ({ matches: false })
    };
  });

  test('1. Default theme is OLED dark mode when no prior preference is stored', () => {
    const theme = getInitialTheme();
    assert.equal(theme, 'dark');
    assert.equal(classListSet.has('dark'), true);
    assert.equal(attributes['data-theme'], 'dark');
    assert.equal(metaThemeColor, '#0B0F17');
  });

  test('2. Restores saved light theme from localStorage correctly', () => {
    mockStorage[THEME_STORAGE_KEY] = 'light';
    const theme = getInitialTheme();
    assert.equal(theme, 'light');
    assert.equal(classListSet.has('dark'), false);
    assert.equal(classListSet.has('light'), true);
    assert.equal(attributes['data-theme'], 'light');
    assert.equal(metaThemeColor, '#F8FAFC');
  });

  test('3. Toggles from dark to light mode and persists to DOM & storage', () => {
    applyThemeToDOM('light');
    assert.equal(mockStorage[THEME_STORAGE_KEY], 'light');
    assert.equal(classListSet.has('dark'), false);
    assert.equal(classListSet.has('light'), true);
    assert.equal(attributes['data-theme'], 'light');
    assert.equal(metaThemeColor, '#F8FAFC');
  });

  test('4. Toggles from light to dark mode and restores OLED dark tokens', () => {
    applyThemeToDOM('light');
    applyThemeToDOM('dark');
    assert.equal(mockStorage[THEME_STORAGE_KEY], 'dark');
    assert.equal(classListSet.has('dark'), true);
    assert.equal(classListSet.has('light'), false);
    assert.equal(attributes['data-theme'], 'dark');
    assert.equal(metaThemeColor, '#0B0F17');
  });

  test('5. Respects system prefers-color-scheme light when no explicit storage key exists', () => {
    (global as any).window.matchMedia = (query: string) => ({
      matches: query.includes('light')
    });
    const theme = getInitialTheme();
    assert.equal(theme, 'light');
    assert.equal(classListSet.has('light'), true);
  });
});
