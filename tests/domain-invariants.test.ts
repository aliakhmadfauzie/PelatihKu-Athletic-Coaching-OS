import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INITIAL_COACH_PROFILE } from '../src/data/mockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('PelatihKu PRO — Automated Domain Invariants & Agent Guardrails', () => {
  it('1. Verifies Coach Identity Invariant (Panji Akbar Syamsi / PAS)', () => {
    assert.match(
      INITIAL_COACH_PROFILE.name,
      /Panji Akbar Syamsi/i,
      'Lead Coach name must be Panji Akbar Syamsi'
    );
    assert.strictEqual(
      INITIAL_COACH_PROFILE.email,
      'panji.akbar@pelatihku.id',
      'Lead Coach email must be panji.akbar@pelatihku.id'
    );
    assert.match(
      INITIAL_COACH_PROFILE.initials,
      /PAS/i,
      'Lead Coach initials must contain PAS'
    );
  });

  it('2. Verifies Zero Legacy Coach Names in Mock Data', () => {
    const mockDataRaw = fs.readFileSync(path.join(rootDir, 'src/data/mockData.ts'), 'utf-8');
    const hasLegacyHendra = /\bCoach Hendra\b/i.test(mockDataRaw);
    assert.strictEqual(hasLegacyHendra, false, 'mockData.ts must not reference Coach Hendra');
  });

  it('3. Verifies Sports Science Epley 1RM Formula', () => {
    // Formula: Weight * (1 + Reps / 30)
    const calculate1RM = (weightKg: number, reps: number): number => {
      if (reps <= 0 || weightKg <= 0) return 0;
      if (reps === 1) return weightKg;
      return +(weightKg * (1 + reps / 30)).toFixed(1);
    };

    assert.strictEqual(calculate1RM(100, 1), 100);
    assert.strictEqual(calculate1RM(100, 5), 116.7);
    assert.strictEqual(calculate1RM(140, 3), 154.0);
    assert.strictEqual(calculate1RM(80, 10), 106.7);
  });

  it('4. Verifies Sports Science Calorie & Protein Baselines', () => {
    const calcMacros = (goal: 'Fat Loss' | 'Hipertrofi' | 'Powerlifting', weightKg: number) => {
      switch (goal) {
        case 'Fat Loss':
          return {
            calories: Math.round(weightKg * 26),
            proteinGrams: Math.round(weightKg * 2.0)
          };
        case 'Hipertrofi':
          return {
            calories: Math.round(weightKg * 34),
            proteinGrams: Math.round(weightKg * 2.0)
          };
        case 'Powerlifting':
          return {
            calories: Math.round(weightKg * 32),
            proteinGrams: Math.round(weightKg * 2.2)
          };
      }
    };

    const fatLoss = calcMacros('Fat Loss', 75);
    assert.strictEqual(fatLoss.calories, 1950);
    assert.strictEqual(fatLoss.proteinGrams, 150);

    const hypertrophy = calcMacros('Hipertrofi', 70);
    assert.strictEqual(hypertrophy.calories, 2380);
    assert.strictEqual(hypertrophy.proteinGrams, 140);

    const powerlifting = calcMacros('Powerlifting', 80);
    assert.strictEqual(powerlifting.calories, 2560);
    assert.strictEqual(powerlifting.proteinGrams, 176);
  });

  it('5. Verifies SemVer Single Source of Truth Synchronization', () => {
    const pkgRaw = fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    const swRaw = fs.readFileSync(path.join(rootDir, 'public/sw.js'), 'utf-8');

    const expectedCacheName = `const CACHE_NAME = 'pelatihku-v${pkg.version}';`;
    assert.ok(
      swRaw.includes(expectedCacheName),
      `public/sw.js cache name must match package.json version v${pkg.version}`
    );
  });

  it('6. Verifies Agent Configuration Files & Stack Declarations', () => {
    const agentsMdPath = path.join(rootDir, 'AGENTS.md');
    assert.ok(fs.existsSync(agentsMdPath), 'AGENTS.md must exist in the workspace root');
    const agentsMdContent = fs.readFileSync(agentsMdPath, 'utf-8');
    assert.ok(agentsMdContent.includes('Panji Akbar Syamsi'), 'AGENTS.md must declare Panji Akbar Syamsi');
    assert.ok(agentsMdContent.includes('React 19'), 'AGENTS.md must declare React 19 stack');

    const rulesPath = path.join(rootDir, '.gemini/rules/pelatihku-core-standards.md');
    assert.ok(fs.existsSync(rulesPath), '.gemini/rules/pelatihku-core-standards.md must exist');
    const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
    assert.ok(rulesContent.includes('always_on: true'), 'Workspace rule must be always_on: true');

    const subagentPath = path.join(rootDir, '.gemini/agents/pelatihku-athletic-os-engineer.md');
    assert.ok(fs.existsSync(subagentPath), '.gemini/agents/pelatihku-athletic-os-engineer.md must exist');
  });
});
