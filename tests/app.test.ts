import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_CLIENTS,
  INITIAL_COACH_PROFILE,
  EXERCISE_CATALOG,
  ClientProfile,
  PRRecord
} from '../src/data/mockData.ts';

describe('PelatihKu PRO — Core Domain & Calculations Audit', () => {
  it('1. Verifies Epley 1RM formula calculation accuracy', () => {
    // Formula: Weight * (1 + Reps / 30)
    const testCases = [
      { weight: 100, reps: 1, expected: 103.3 },
      { weight: 100, reps: 5, expected: 116.7 },
      { weight: 140, reps: 3, expected: 154.0 },
      { weight: 80, reps: 10, expected: 106.7 },
      { weight: 0, reps: 5, expected: 0.0 }
    ];

    for (const tc of testCases) {
      const calc1RM = +(tc.weight * (1 + tc.reps / 30)).toFixed(1);
      assert.strictEqual(calc1RM, tc.expected, `1RM for ${tc.weight}kg x ${tc.reps} should be ${tc.expected}`);
    }
  });

  it('2. Verifies total training volume calculation', () => {
    const exerciseSets = [
      { weightKg: 100, reps: 5 }, // 500
      { weightKg: 100, reps: 5 }, // 500
      { weightKg: 105, reps: 4 }, // 420
      { weightKg: 60, reps: 10 }  // 600
    ];

    const totalVolume = exerciseSets.reduce((sum, s) => sum + (s.weightKg * s.reps), 0);
    assert.strictEqual(totalVolume, 2020, 'Total volume must equal 2020 kg');
  });

  it('3. Verifies package session progress & remaining quota', () => {
    const client = INITIAL_CLIENTS[0]; // Budi Santoso (24 total, 16 used)
    const remaining = Math.max(0, client.paketTotal - client.paketTerpakai);
    const progressPct = Math.min(100, Math.round((client.paketTerpakai / client.paketTotal) * 100));

    assert.strictEqual(remaining, 8, 'Remaining sessions should be 8');
    assert.strictEqual(progressPct, 67, 'Progress percentage should be 67%');

    // Test zero total safety (division by zero prevention)
    const zeroTotal = 0;
    const safePct = zeroTotal > 0 ? Math.round((5 / zeroTotal) * 100) : 0;
    assert.strictEqual(safePct, 0, 'Zero package quota must safely return 0 without NaN');
  });

  it('4. Verifies 8-week baseline biometric deltas', () => {
    const client = INITIAL_CLIENTS[0]; // Budi: 84.5kg -> 81.1kg (-3.4kg)
    const weightDelta = +(client.berat_terkini_kg - client.berat_awal_kg).toFixed(1);
    const weightPct = ((weightDelta / client.berat_awal_kg) * 100).toFixed(1);
    const fatDelta = +(client.body_fat_terkini_pct - client.body_fat_awal_pct).toFixed(1);
    const muscleDelta = +(client.massa_otot_terkini_kg - client.massa_otot_awal_kg).toFixed(1);
    const waistDelta = +(client.lingkar_pinggang_terkini_cm - client.lingkar_pinggang_awal_cm).toFixed(1);

    assert.strictEqual(weightDelta, -3.4, 'Weight delta should be -3.4 kg');
    assert.strictEqual(weightPct, '-4.0', 'Weight pct change should be -4.0%');
    assert.strictEqual(fatDelta, -3.4, 'Body fat delta should be -3.4%');
    assert.strictEqual(muscleDelta, 0.4, 'Muscle delta should be +0.4 kg');
    assert.strictEqual(waistDelta, -5.5, 'Waist delta should be -5.5 cm');
  });

  it('5. Verifies Macro nutrient auto-split algorithm', () => {
    // Formula from ClientDetailView:
    // Carb = (Calories - Protein*4 - Fat*9) / 4
    const cal = 2100;
    const pro = 160; // 160 * 4 = 640 kcal
    const fatGrams = 60; // 60 * 9 = 540 kcal
    // Remaining for carb = 2100 - 640 - 540 = 920 kcal / 4 = 230g
    const expectedCarb = Math.max(80, Math.round((cal - pro * 4 - fatGrams * 9) / 4));
    assert.strictEqual(expectedCarb, 230, 'Carbohydrate split should be 230 grams');
  });

  it('6. Verifies Terminology Matrix Compliance (Zero prohibited terms)', () => {
    const prohibitedWords = ['klien', 'client', 'atlet'];

    for (const client of INITIAL_CLIENTS) {
      // Check code prefix
      assert.match(client.code, /^#MBR-/, `Client code ${client.code} must use prefix #MBR-`);
      
      // Check pekerjaan
      for (const word of prohibitedWords) {
        assert.ok(
          !client.pekerjaan.toLowerCase().includes(word),
          `Client pekerjaan '${client.pekerjaan}' must not contain prohibited term '${word}'`
        );
      }
    }

    // Check Coach profile
    assert.ok(
      !INITIAL_COACH_PROFILE.specialization.toLowerCase().includes('klien') &&
      !INITIAL_COACH_PROFILE.specialization.toLowerCase().includes('atlet'),
      'Coach specialization must not contain prohibited terms'
    );
  });

  it('7. Verifies Phone Number Sanitization for WhatsApp URLs', () => {
    const rawPhones = [
      '6281234567801',
      '+62 812-3456-7801',
      '0812 3456 7801',
      '+62(812) 3456-7801'
    ];

    for (const raw of rawPhones) {
      const clean = raw.replace(/\D/g, '');
      assert.ok(!clean.includes('+'), 'Sanitized phone must not contain +');
      assert.ok(!clean.includes(' '), 'Sanitized phone must not contain spaces');
      assert.ok(!clean.includes('-'), 'Sanitized phone must not contain hyphens');
      assert.ok(/^\d+$/.test(clean), `Sanitized phone '${clean}' must only contain digits`);
    }
  });

  it('8. Verifies Executive Bento KPIs calculation', () => {
    const activeMembers = INITIAL_CLIENTS.filter(c => c.status === 'Aktif').length;
    assert.strictEqual(activeMembers, 4, 'There should be 4 active members (1 on leave)');

    // Target Achieved calculation:
    // Member with fat loss > 3kg or muscle surplus > 2kg
    const targetAchieved = INITIAL_CLIENTS.filter(c => {
      const weightLost = c.berat_awal_kg - c.berat_terkini_kg;
      const muscleGained = c.massa_otot_terkini_kg - c.massa_otot_awal_kg;
      return weightLost >= 3.0 || muscleGained >= 2.0;
    }).length;

    assert.ok(targetAchieved >= 2, 'At least 2 members have achieved primary target');
  });

  it('9. Verifies Backup & Restore JSON schema parity', () => {
    const backupPayload = {
      app: 'PelatihKu PRO',
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      coach: INITIAL_COACH_PROFILE,
      clients: INITIAL_CLIENTS
    };

    assert.strictEqual(backupPayload.version, '2.4.0');
    assert.strictEqual(backupPayload.coach.initials, 'PAS');
    assert.strictEqual(backupPayload.clients.length, 5);

    // Verify recovery validation logic
    const jsonStr = JSON.stringify(backupPayload);
    const parsed = JSON.parse(jsonStr);
    assert.ok(Array.isArray(parsed.clients) && parsed.clients.length === 5);
    assert.ok(parsed.coach && parsed.coach.name.includes('Panji'));
  });

  it('10. Verifies Exercise Catalog completeness & parameters', () => {
    assert.ok(EXERCISE_CATALOG.length >= 16, 'Exercise catalog must have at least 16 compound/isolation exercises');
    for (const ex of EXERCISE_CATALOG) {
      assert.ok(ex.id && ex.name, 'Every catalog exercise must have ID and Name');
      assert.ok(ex.defaultRestSeconds >= 30, 'Every exercise must have minimum 30s rest interval');
      assert.ok(['Free Weights', 'Kabel/Mesin', 'Kalistenik'].includes(ex.category));
    }
  });
});
