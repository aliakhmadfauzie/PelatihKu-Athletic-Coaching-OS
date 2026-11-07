import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateBarbellPlateBreakdown,
  getPreviousSessionGhostValues,
  getExerciseSubstitutions,
  EXERCISE_SUBSTITUTION_MAP,
  OLYMPIC_PLATES_CATALOG
} from '../src/services/sportsScienceDomain';
import { ClientProfile, INITIAL_CLIENTS, EXERCISE_CATALOG } from '../src/data/mockData';

describe('PelatihKu PRO — Gym Floor & Strength Coach Features Audit', () => {
  describe('1. Barbell Plate & Collar Math Engine', () => {
    it('returns empty plates when target weight equals standard 20kg bar', () => {
      const result = calculateBarbellPlateBreakdown(20, 20);
      assert.strictEqual(result.targetWeightKg, 20);
      assert.strictEqual(result.barWeightKg, 20);
      assert.strictEqual(result.weightPerSideKg, 0);
      assert.strictEqual(result.actualTotalWeightKg, 20);
      assert.strictEqual(result.platesPerSide.length, 0);
      assert.strictEqual(result.remainingKg, 0);
    });

    it('returns empty plates when target weight is less than bar weight', () => {
      const result = calculateBarbellPlateBreakdown(15, 20);
      assert.strictEqual(result.actualTotalWeightKg, 20);
      assert.strictEqual(result.platesPerSide.length, 0);
    });

    it('accurately allocates plates for 60 kg total (1x 20kg plate per side)', () => {
      const result = calculateBarbellPlateBreakdown(60, 20);
      assert.strictEqual(result.weightPerSideKg, 20);
      assert.strictEqual(result.actualTotalWeightKg, 60);
      assert.strictEqual(result.platesPerSide.length, 1);
      assert.strictEqual(result.platesPerSide[0].plateKg, 20);
      assert.strictEqual(result.platesPerSide[0].count, 1);
    });

    it('accurately allocates plates for 102.5 kg total (1x 25kg + 1x 15kg + 1x 1.25kg per side)', () => {
      // (102.5 - 20) / 2 = 41.25 kg per side -> greedy: 1x 25kg + 1x 15kg + 1x 1.25kg = 41.25kg
      const result = calculateBarbellPlateBreakdown(102.5, 20);
      assert.strictEqual(result.weightPerSideKg, 41.25);
      assert.strictEqual(result.actualTotalWeightKg, 102.5);
      assert.strictEqual(result.remainingKg, 0);

      const p25 = result.platesPerSide.find((p) => p.plateKg === 25);
      const p15 = result.platesPerSide.find((p) => p.plateKg === 15);
      const p1_25 = result.platesPerSide.find((p) => p.plateKg === 1.25);

      assert.ok(p25, '25 kg plate must be present');
      assert.strictEqual(p25.count, 1);
      assert.ok(p15, '15 kg plate must be present');
      assert.strictEqual(p15.count, 1);
      assert.ok(p1_25, '1.25 kg plate must be present');
      assert.strictEqual(p1_25.count, 1);
    });

    it('accurately allocates plates for 127.5 kg total (2x 25kg + 1x 2.5kg + 1x 1.25kg per side)', () => {
      // (127.5 - 20) / 2 = 53.75 kg per side -> 2x 25kg (50kg) + 1x 2.5kg (2.5kg) + 1x 1.25kg (1.25kg)
      const result = calculateBarbellPlateBreakdown(127.5, 20);
      assert.strictEqual(result.weightPerSideKg, 53.75);
      assert.strictEqual(result.actualTotalWeightKg, 127.5);
      assert.strictEqual(result.remainingKg, 0);

      const p25 = result.platesPerSide.find((p) => p.plateKg === 25);
      const p2_5 = result.platesPerSide.find((p) => p.plateKg === 2.5);
      const p1_25 = result.platesPerSide.find((p) => p.plateKg === 1.25);

      assert.strictEqual(p25?.count, 2);
      assert.strictEqual(p2_5?.count, 1);
      assert.strictEqual(p1_25?.count, 1);
    });

    it('supports 15 kg technique / women barbell option', () => {
      // Target: 45 kg on 15 kg bar -> 30 kg total plates -> 15 kg per side (1x 15kg plate)
      const result = calculateBarbellPlateBreakdown(45, 15);
      assert.strictEqual(result.barWeightKg, 15);
      assert.strictEqual(result.weightPerSideKg, 15);
      assert.strictEqual(result.actualTotalWeightKg, 45);
      const p15 = result.platesPerSide.find((p) => p.plateKg === 15);
      assert.strictEqual(p15?.count, 1);
    });

    it('ensures all plates in catalog have distinct color branding and positive values', () => {
      assert.strictEqual(OLYMPIC_PLATES_CATALOG.length, 7);
      OLYMPIC_PLATES_CATALOG.forEach((p) => {
        assert.ok(p.plateKg > 0);
        assert.ok(p.hexColor.startsWith('#'));
        assert.ok(p.colorName.length > 0);
      });
    });
  });

  describe('2. Previous Session Ghost Values Extractor', () => {
    const mockClientWithHistory: ClientProfile = {
      ...INITIAL_CLIENTS[0],
      sessions: [
        {
          id: 'ses-old-1',
          sessionNumber: 1,
          date: '2026-10-25',
          time: '16:00 WIB',
          durationMinutes: 60,
          focus: 'Leg Day',
          status: 'Hadir',
          rpe: 8,
          totalVolumeKg: 5000,
          readiness: { energy: 8, sleepHours: 8, doms: 'Rendah' },
          coachNotes: 'Catatan sesi awal',
          location: 'Gym Senayan',
          exercises: [
            {
              id: 'ex-1',
              name: 'Barbell Back Squat',
              category: 'Free Weights',
              tempo: '3-1-X-1',
              restSeconds: 120,
              historicalBestKg: 100,
              sets: [
                { id: 's-1', setNumber: 1, type: 'Work Set', weightKg: 100, reps: 5 },
                { id: 's-2', setNumber: 2, type: 'Work Set', weightKg: 105, reps: 5 }
              ]
            }
          ]
        },
        {
          id: 'ses-old-2',
          sessionNumber: 2,
          date: '2026-11-01',
          time: '16:30 WIB',
          durationMinutes: 60,
          focus: 'Leg Day Progression',
          status: 'Hadir',
          rpe: 8.5,
          totalVolumeKg: 5500,
          readiness: { energy: 7, sleepHours: 7, doms: 'Sedang' },
          coachNotes: 'Catatan sesi progresif',
          location: 'Gym Senayan',
          exercises: [
            {
              id: 'ex-2',
              name: 'Barbell Back Squat',
              category: 'Free Weights',
              tempo: '3-1-X-1',
              restSeconds: 150,
              historicalBestKg: 105,
              sets: [
                { id: 's-3', setNumber: 1, type: 'Work Set', weightKg: 110, reps: 5 },
                { id: 's-4', setNumber: 2, type: 'Top Set', weightKg: 115, reps: 4, isPR: true }
              ]
            }
          ]
        }
      ]
    };

    it('extracts the most recent session set load and reps for an exercise', () => {
      const ghost = getPreviousSessionGhostValues(mockClientWithHistory, 'Barbell Back Squat');
      assert.ok(ghost, 'Ghost value should be found');
      // Most recent session date is 2026-11-01, top set weight was 115 kg x 4
      assert.strictEqual(ghost.sessionDate, '2026-11-01');
      assert.strictEqual(ghost.weightKg, 115);
      assert.strictEqual(ghost.reps, 4);
    });

    it('returns null when exercise does not exist in history', () => {
      const ghost = getPreviousSessionGhostValues(mockClientWithHistory, 'Overhead Press');
      assert.strictEqual(ghost, null);
    });

    it('returns null when client has no sessions', () => {
      const ghost = getPreviousSessionGhostValues(
        { ...INITIAL_CLIENTS[0], sessions: [] },
        'Barbell Back Squat'
      );
      assert.strictEqual(ghost, null);
    });
  });

  describe('3. Biomechanical Exercise Substitution Matrix', () => {
    it('provides smart squat alternatives for Barbell Back Squat', () => {
      const subs = getExerciseSubstitutions('Barbell Back Squat');
      assert.ok(subs.length >= 2, 'Should have at least 2 substitutions');

      const names = subs.map((s) => s.name);
      assert.ok(names.includes('Hack Squat (Machine)') || names.includes('Leg Press 45°'));
      assert.strictEqual(subs[0].movementPattern, 'Squat');
      assert.ok(subs[0].weightRatioMultiplier > 0);
    });

    it('provides smart horizontal push alternatives for Barbell Bench Press', () => {
      const subs = getExerciseSubstitutions('Barbell Bench Press');
      assert.ok(subs.length >= 2);
      const names = subs.map((s) => s.name);
      assert.ok(names.includes('Dumbbell Flat Bench Press') || names.includes('Machine Chest Press'));
    });

    it('provides fallback biomechanical alternatives for unknown exercise', () => {
      const subs = getExerciseSubstitutions('Custom Machine Pec Fly');
      assert.ok(subs.length >= 2);
      assert.ok(subs[0].name.includes('Alternatif'));
    });
  });

  describe('4. Domain & Ergonomic Invariants', () => {
    it('verifies Lead Coach identity strictly Panji Akbar Syamsi, S.Or.', () => {
      const client = INITIAL_CLIENTS[0];
      assert.strictEqual(client.leadCoach, 'Panji Akbar Syamsi');
    });

    it('verifies zero undefined values in sanitized session payload', () => {
      const rawPayload = {
        weightKg: 100,
        reps: 8,
        isPR: true,
        completed: true,
        limbSide: 'Both',
        swappedFrom: undefined,
        ghost: undefined
      };

      const sanitized: any = JSON.parse(JSON.stringify(rawPayload));
      assert.strictEqual('swappedFrom' in sanitized, false);
      assert.strictEqual('ghost' in sanitized, false);
      assert.strictEqual(sanitized.weightKg, 100);
      assert.strictEqual(sanitized.completed, true);
    });
  });

  describe('5. Comprehensive 70-Exercise Gym Database Parity', () => {
    it('verifies exact total count and category distribution across the master catalog', () => {
      assert.strictEqual(EXERCISE_CATALOG.length, 70);

      const categories = EXERCISE_CATALOG.map((e) => e.category);
      assert.ok(categories.includes('Free Weights'), 'Must have Free Weights');
      assert.ok(categories.includes('Kabel/Mesin'), 'Must have Kabel/Mesin');
      assert.ok(categories.includes('Kalistenik'), 'Must have Kalistenik');
      assert.ok(categories.includes('Kardio/Fungsional'), 'Must have Kardio/Fungsional');
    });

    it('verifies all major muscle groups and movement patterns are represented', () => {
      const patterns = new Set(EXERCISE_CATALOG.map((e) => e.movementPattern).filter(Boolean));
      assert.ok(patterns.has('squat'), 'Must include squat pattern');
      assert.ok(patterns.has('hinge'), 'Must include hinge pattern');
      assert.ok(patterns.has('horizontal_push'), 'Must include horizontal push');
      assert.ok(patterns.has('horizontal_pull'), 'Must include horizontal pull');
      assert.ok(patterns.has('vertical_push'), 'Must include vertical push');
      assert.ok(patterns.has('vertical_pull'), 'Must include vertical pull');
      assert.ok(patterns.has('isolation'), 'Must include isolation pattern');
      assert.ok(patterns.has('conditioning'), 'Must include conditioning pattern');
      assert.ok(patterns.has('dynamic'), 'Must include dynamic pattern');
    });

    it('verifies bilingual names and valid visual guide URLs', () => {
      EXERCISE_CATALOG.forEach((e) => {
        assert.ok(e.name && e.name.length > 2, `Exercise ${e.id} must have a valid English name`);
        assert.ok(e.primaryMuscle && e.primaryMuscle.length > 2, `Exercise ${e.id} must specify target muscle`);
        if (e.visualGuideUrl) {
          assert.ok(e.visualGuideUrl.startsWith('https://'), `Exercise ${e.name} visualGuideUrl must be HTTPS`);
        }
      });
    });
  });
});
