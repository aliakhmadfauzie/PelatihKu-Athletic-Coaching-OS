import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEpley1RM,
  extractBestPRSet,
  calculateBaselineMacros,
  advanceBiometricTrend
} from '../src/services/sportsScienceDomain';
import {
  assertValidRescheduleTransition,
  createRescheduleRequest,
  processApproveReschedule,
  processRejectReschedule,
  processCancelReschedule
} from '../src/services/rescheduleMatrixService';
import {
  clearAllPushNotifications,
  getPushNotifications,
  notifyRescheduleRequested,
  notifyRescheduleApproved
} from '../src/services/pushNotificationService';
import { INITIAL_CLIENTS, ClientProfile } from '../src/data/mockData';

describe('PelatihKu PRO — System Logic Architect Audit & Domain Invariants', () => {
  it('1. Enforces Epley 1RM boundary invariants (reps = 1, 1..30, <=0, >30)', () => {
    // reps = 1 -> exact weightKg (1RM = Beban)
    assert.strictEqual(calculateEpley1RM(115, 1), 115);
    assert.strictEqual(calculateEpley1RM(142.5, 1), 142.5);

    // Standard range 2..30
    assert.strictEqual(calculateEpley1RM(100, 5), 116.7);
    assert.strictEqual(calculateEpley1RM(80, 10), 106.7);
    assert.strictEqual(calculateEpley1RM(60, 30), 120.0);

    // Out-of-bounds > 30 clamps to 30 reps
    assert.strictEqual(calculateEpley1RM(60, 45), 120.0);

    // Invalid inputs <= 0 return 0
    assert.strictEqual(calculateEpley1RM(100, 0), 0);
    assert.strictEqual(calculateEpley1RM(0, 5), 0);
    assert.strictEqual(calculateEpley1RM(-50, 5), 0);
    assert.strictEqual(calculateEpley1RM(100, -3), 0);
  });

  it('2. Extracts the highest 1RM / weight PR set when multiple sets in an exercise are marked isPR', () => {
    const sets = [
      { weightKg: 100, reps: 8, isPR: false },
      { weightKg: 112.5, reps: 3, isPR: true }, // 1RM = 123.8
      { weightKg: 117.5, reps: 2, isPR: true }, // 1RM = 125.3 (Strongest!)
      { weightKg: 115, reps: 2, isPR: true }    // 1RM = 122.7
    ];

    const best = extractBestPRSet(sets, 110);
    assert.ok(best, 'Must return a valid PR set result');
    assert.strictEqual(best.weightKg, 117.5);
    assert.strictEqual(best.reps, 2);
    assert.strictEqual(best.est1RM, 125.3);
    assert.strictEqual(best.deltaKg, 7.5);

    // Single rep PR uses exact weightKg for est1RM
    const singleRepSets = [{ weightKg: 140, reps: 1, isPR: true }];
    const singleBest = extractBestPRSet(singleRepSets, 135);
    assert.ok(singleBest);
    assert.strictEqual(singleBest.est1RM, 140);
    assert.strictEqual(singleBest.deltaKg, 5.0);
  });

  it('3. Enforces baseline calorie & protein formulas across all 3 training categories', () => {
    assert.deepStrictEqual(calculateBaselineMacros('Fat Loss', 80), {
      calories: 2080,
      proteinGrams: 160
    });
    assert.deepStrictEqual(calculateBaselineMacros('Hipertrofi', 75), {
      calories: 2550,
      proteinGrams: 150
    });
    assert.deepStrictEqual(calculateBaselineMacros('Powerlifting', 85), {
      calories: 2720,
      proteinGrams: 187
    });
  });

  it('4. Preserves M1 baseline intact when advancing or calibrating weekly biometric trends', () => {
    const baseline = { weightKg: 85.0, bodyFatPct: 22.0, muscleMassKg: 35.0, waistCm: 90.0 };
    const calibrated1 = { weightKg: 82.5, bodyFatPct: 20.5, muscleMassKg: 35.8, waistCm: 87.0 };

    // Case A: Only M1 exists -> appends M8 while keeping M1 untouched
    const trendFromSingle = advanceBiometricTrend(
      [{ weekLabel: 'M1', ...baseline }],
      baseline,
      calibrated1
    );
    assert.strictEqual(trendFromSingle.length, 2);
    assert.strictEqual(trendFromSingle[0].weekLabel, 'M1');
    assert.strictEqual(trendFromSingle[0].weightKg, 85.0);
    assert.strictEqual(trendFromSingle[1].weekLabel, 'M8');
    assert.strictEqual(trendFromSingle[1].weightKg, 82.5);

    // Case B: Subsequent calibration updates latest checkpoint without mutating M1
    const calibrated2 = { weightKg: 81.2, bodyFatPct: 19.8, muscleMassKg: 36.2, waistCm: 85.5 };
    const trendUpdated = advanceBiometricTrend(trendFromSingle, baseline, calibrated2);
    assert.strictEqual(trendUpdated.length, 2);
    assert.strictEqual(trendUpdated[0].weightKg, 85.0);
    assert.strictEqual(trendUpdated[1].weightKg, 81.2);
  });

  it('5. Rejects invalid terminal-state transitions in the Reschedule State Machine', () => {
    // Valid transitions from 'pending' do not throw
    assert.doesNotThrow(() => assertValidRescheduleTransition('pending', 'approved'));
    assert.doesNotThrow(() => assertValidRescheduleTransition('pending', 'rejected'));
    assert.doesNotThrow(() => assertValidRescheduleTransition('pending', 'cancelled'));

    // Terminal states ('approved', 'rejected', 'cancelled') must reject any further transition
    assert.throws(
      () => assertValidRescheduleTransition('approved', 'rejected'),
      /Transisi status reschedule tidak valid/i
    );
    assert.throws(
      () => assertValidRescheduleTransition('rejected', 'approved'),
      /Transisi status reschedule tidak valid/i
    );
    assert.throws(
      () => assertValidRescheduleTransition('cancelled', 'approved'),
      /Transisi status reschedule tidak valid/i
    );

    const sampleClient: ClientProfile = {
      ...INITIAL_CLIENTS[0],
      nextSession: {
        date: '2026-11-10',
        time: '16:00',
        focus: 'Lower Body',
        location: 'Gym Utama Senayan',
        confirmed: true
      }
    };

    const req = createRescheduleRequest({
      client: sampleClient,
      proposedDate: '2026-11-12',
      proposedTime: '10:00',
      proposedLocation: 'SCBD District 8',
      reason: 'Meeting',
      requestedByRole: 'client',
      requestedByName: sampleClient.nama_lengkap
    });

    const { updatedClient, approvedRequest } = processApproveReschedule({
      client: { ...sampleClient, pendingReschedule: req },
      request: req,
      approverRole: 'coach',
      approverName: 'Coach Panji Akbar Syamsi'
    });

    // Attempting to reject or cancel an already-approved request must throw
    assert.throws(
      () =>
        processRejectReschedule({
          client: updatedClient,
          request: approvedRequest,
          rejectorRole: 'admin',
          rejectorName: 'Supervisor',
          reason: 'Double click race condition'
        }),
      /Transisi status reschedule tidak valid/i
    );
    assert.throws(
      () =>
        processCancelReschedule({
          client: updatedClient,
          request: approvedRequest,
          cancellerRole: 'client'
        }),
      /Transisi status reschedule tidak valid/i
    );
  });

  it('6. Synchronizes multi-slot scheduledSessions alongside nextSession upon reschedule approval', () => {
    const clientWithMultiSlots: ClientProfile = {
      ...INITIAL_CLIENTS[0],
      nextSession: {
        date: '2026-11-08',
        time: '16:00',
        focus: 'Upper Push',
        location: 'Gym Utama Senayan',
        confirmed: true
      },
      scheduledSessions: [
        {
          id: 'slot-1',
          date: '2026-11-08',
          time: '16:00',
          focus: 'Upper Push',
          location: 'Gym Utama Senayan',
          durationMinutes: 60,
          sessionNumber: 17,
          status: 'Terkonfirmasi'
        },
        {
          id: 'slot-2',
          date: '2026-11-11',
          time: '17:00',
          focus: 'Lower Body',
          location: 'SCBD District 8',
          durationMinutes: 60,
          sessionNumber: 18,
          status: 'Terkonfirmasi'
        }
      ]
    };

    const req = createRescheduleRequest({
      client: clientWithMultiSlots,
      proposedDate: '2026-11-09',
      proposedTime: '10:30',
      proposedLocation: 'Private Studio Kemang',
      reason: 'Perjalanan dinas',
      requestedByRole: 'client',
      requestedByName: clientWithMultiSlots.nama_lengkap
    });

    const { updatedClient } = processApproveReschedule({
      client: { ...clientWithMultiSlots, pendingReschedule: req },
      request: req,
      approverRole: 'coach',
      approverName: 'Coach Panji Akbar Syamsi'
    });

    assert.strictEqual(updatedClient.nextSession.date, '2026-11-09');
    assert.strictEqual(updatedClient.nextSession.time, '10:30');
    assert.strictEqual(updatedClient.scheduledSessions?.[0].date, '2026-11-09');
    assert.strictEqual(updatedClient.scheduledSessions?.[0].time, '10:30');
    assert.strictEqual(updatedClient.scheduledSessions?.[0].location, 'Private Studio Kemang');
    // Unrelated second slot remains untouched
    assert.strictEqual(updatedClient.scheduledSessions?.[1].date, '2026-11-11');
  });

  it('7. Deduplicates push notifications via deterministic idempotencyKey on retry', async () => {
    clearAllPushNotifications();

    const sampleClient = INITIAL_CLIENTS[0];
    const req = createRescheduleRequest({
      client: sampleClient,
      proposedDate: '2026-11-14',
      proposedTime: '09:00',
      proposedLocation: 'Gym Utama Senayan',
      reason: 'Jadwal pagi',
      requestedByRole: 'client',
      requestedByName: sampleClient.nama_lengkap
    });

    // Dispatch the exact same reschedule request notification twice (simulating network retry)
    const firstNotif = await notifyRescheduleRequested(req);
    const secondNotif = await notifyRescheduleRequested(req);

    assert.strictEqual(firstNotif.id, secondNotif.id);
    assert.strictEqual(firstNotif.id, `notif-rsch-${req.id}-requested`);

    const matchingInStore = getPushNotifications().filter((n) => n.id === firstNotif.id);
    assert.strictEqual(
      matchingInStore.length,
      1,
      'Duplicate notification dispatches with the same idempotencyKey must be deduplicated'
    );

    // Approval notification gets a distinct deterministic key for the approved state
    const approvedNotif = await notifyRescheduleApproved(req, 'Coach Panji Akbar Syamsi');
    assert.strictEqual(approvedNotif.id, `notif-rsch-${req.id}-approved`);
  });
});
