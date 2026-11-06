import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeScaleAndCoordinates,
  computeBiometricAnalysis,
  computeDeltaFromBaseline
} from '../src/components/BiometricTrendChart.tsx';
import { WeeklyBiometricPoint, INITIAL_CLIENTS } from '../src/data/mockData.ts';

describe('BiometricTrendChart — Dynamic Coordinate Mapping & Sports Science Integrity', () => {
  it('1. Computes upward SVG slope for Hypertrophy weight gain (lower Y = higher visual position)', () => {
    // Dimas Anggara: Hypertrophy client gaining weight from 68kg to 71.4kg
    const dimasTrend: WeeklyBiometricPoint[] = [
      { weekLabel: 'M1', weightKg: 68.0, bodyFatPct: 15.0, muscleMassKg: 33.0, waistCm: 76.0 },
      { weekLabel: 'M4', weightKg: 69.5, bodyFatPct: 15.2, muscleMassKg: 34.2, waistCm: 76.5 },
      { weekLabel: 'M8', weightKg: 71.4, bodyFatPct: 15.4, muscleMassKg: 35.5, waistCm: 77.0 }
    ];

    const result = computeScaleAndCoordinates(dimasTrend, 'weightKg');
    assert.strictEqual(result.coordinates.length, 3);

    const firstCoord = result.coordinates[0];
    const lastCoord = result.coordinates[result.coordinates.length - 1];

    // In SVG space: y = 0 is top of canvas. Higher value must have smaller Y coordinate.
    assert.ok(
      lastCoord.y < firstCoord.y,
      `Weight gain must yield lower Y value for upward visual slope. Got first.y=${firstCoord.y}, last.y=${lastCoord.y}`
    );
    assert.strictEqual(firstCoord.value, 68.0);
    assert.strictEqual(lastCoord.value, 71.4);
  });

  it('2. Computes downward SVG slope for Fat Loss weight reduction (higher Y = lower visual position)', () => {
    // Budi Santoso: Fat Loss client reducing weight from 84.5kg to 81.1kg
    const budiTrend: WeeklyBiometricPoint[] = [
      { weekLabel: 'M1', weightKg: 84.5, bodyFatPct: 24.2, muscleMassKg: 34.5, waistCm: 92.0 },
      { weekLabel: 'M4', weightKg: 82.8, bodyFatPct: 22.5, muscleMassKg: 34.6, waistCm: 89.5 },
      { weekLabel: 'M8', weightKg: 81.1, bodyFatPct: 20.8, muscleMassKg: 34.8, waistCm: 87.0 }
    ];

    const result = computeScaleAndCoordinates(budiTrend, 'weightKg');
    assert.strictEqual(result.coordinates.length, 3);

    const firstCoord = result.coordinates[0];
    const lastCoord = result.coordinates[result.coordinates.length - 1];

    // In SVG space: weight loss means y value increases (moves down toward bottom)
    assert.ok(
      lastCoord.y > firstCoord.y,
      `Weight reduction must yield higher Y value for downward visual slope. Got first.y=${firstCoord.y}, last.y=${lastCoord.y}`
    );
    assert.strictEqual(firstCoord.value, 84.5);
    assert.strictEqual(lastCoord.value, 81.1);
  });

  it('3. Generates accurate goal-specific narrative for Fat Loss', () => {
    const budiTrend: WeeklyBiometricPoint[] = [
      { weekLabel: 'M1', weightKg: 84.5, bodyFatPct: 24.2, muscleMassKg: 34.5, waistCm: 92.0 },
      { weekLabel: 'M8', weightKg: 81.1, bodyFatPct: 20.8, muscleMassKg: 34.8, waistCm: 87.0 }
    ];

    const analysis = computeBiometricAnalysis(budiTrend, 'Fat Loss');
    assert.strictEqual(analysis.badge, 'Defisit Terkendali & Optimal');
    assert.strictEqual(analysis.isPositive, true);
    assert.strictEqual(analysis.deltaWeight, -3.4);
    assert.strictEqual(analysis.deltaFat, -3.4);
    assert.strictEqual(analysis.deltaMuscle, 0.3);
    assert.match(analysis.narrative, /Penurunan berat total 3.4 kg/);
    assert.match(analysis.narrative, /reduksi lemak tubuh 3.4%/);
    assert.match(analysis.narrative, /Massa otot terjaga optimal/);
  });

  it('4. Generates accurate goal-specific narrative for Hipertrofi', () => {
    const dimasTrend: WeeklyBiometricPoint[] = [
      { weekLabel: 'M1', weightKg: 68.0, bodyFatPct: 15.0, muscleMassKg: 33.0, waistCm: 76.0 },
      { weekLabel: 'M8', weightKg: 71.4, bodyFatPct: 15.4, muscleMassKg: 35.5, waistCm: 77.0 }
    ];

    const analysis = computeBiometricAnalysis(dimasTrend, 'Hipertrofi');
    assert.strictEqual(analysis.badge, 'Hipertrofi Positif (Lean Gains)');
    assert.strictEqual(analysis.isPositive, true);
    assert.strictEqual(analysis.deltaMuscle, 2.5);
    assert.strictEqual(analysis.deltaWeight, 3.4);
    assert.match(analysis.narrative, /Pertumbuhan massa otot rangka \+2.5 kg/);
    assert.match(analysis.narrative, /peningkatan berat terencana \+3.4 kg/);
  });

  it('5. Computes delta and percentage change from baseline correctly', () => {
    const baseline: WeeklyBiometricPoint = {
      weekLabel: 'M1',
      weightKg: 80.0,
      bodyFatPct: 20.0,
      muscleMassKg: 35.0,
      waistCm: 85.0
    };
    const active: WeeklyBiometricPoint = {
      weekLabel: 'M8',
      weightKg: 76.0,
      bodyFatPct: 16.0,
      muscleMassKg: 35.5,
      waistCm: 81.0
    };

    const weightDelta = computeDeltaFromBaseline(active, baseline, 'weightKg');
    assert.strictEqual(weightDelta.diff, -4.0);
    assert.strictEqual(weightDelta.pct, -5.0); // -4 / 80 * 100 = -5.0%

    const fatDelta = computeDeltaFromBaseline(active, baseline, 'bodyFatPct');
    assert.strictEqual(fatDelta.diff, -4.0);
    assert.strictEqual(fatDelta.pct, -20.0); // -4 / 20 * 100 = -20.0%
  });

  it('6. Handles single-checkpoint edge case without NaN or division by zero', () => {
    const singlePoint: WeeklyBiometricPoint[] = [
      { weekLabel: 'M1', weightKg: 75.0, bodyFatPct: 18.0, muscleMassKg: 34.0, waistCm: 82.0 }
    ];

    const result = computeScaleAndCoordinates(singlePoint, 'weightKg');
    assert.strictEqual(result.coordinates.length, 1);
    assert.ok(!Number.isNaN(result.coordinates[0].x));
    assert.ok(!Number.isNaN(result.coordinates[0].y));

    // When 1 point exists, it should be horizontally centered
    const expectedCenterX = 42 + (360 - 42 - 20) / 2; // padLeft + usableWidth / 2 = 42 + 149 = 191
    assert.strictEqual(result.coordinates[0].x, expectedCenterX);

    const analysis = computeBiometricAnalysis(singlePoint, 'Fat Loss');
    assert.strictEqual(analysis.deltaWeight, 0);
    assert.strictEqual(analysis.deltaFat, 0);
    assert.ok(!Number.isNaN(analysis.totalWeeks));
  });

  it('7. Validates all initial mock clients have valid weeklyTrend data', () => {
    INITIAL_CLIENTS.forEach((client) => {
      assert.ok(
        client.weeklyTrend && client.weeklyTrend.length >= 1,
        `Client ${client.id} (${client.nama_lengkap}) must have at least 1 weeklyTrend point`
      );

      // Verify scale & coords can be calculated for each metric
      const metrics: Array<'weightKg' | 'bodyFatPct' | 'muscleMassKg' | 'waistCm'> = [
        'weightKg',
        'bodyFatPct',
        'muscleMassKg',
        'waistCm'
      ];
      metrics.forEach((m) => {
        const computed = computeScaleAndCoordinates(client.weeklyTrend!, m);
        assert.strictEqual(computed.coordinates.length, client.weeklyTrend!.length);
        computed.coordinates.forEach((coord) => {
          assert.ok(!Number.isNaN(coord.x), `Coord X must not be NaN for client ${client.id}`);
          assert.ok(!Number.isNaN(coord.y), `Coord Y must not be NaN for client ${client.id}`);
        });
      });
    });
  });
});
