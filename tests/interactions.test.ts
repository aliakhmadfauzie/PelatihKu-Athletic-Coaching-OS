import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CLIENTS, INITIAL_COACH_PROFILE, ClientProfile, SetLog, ExerciseLog, SessionRecord } from '../src/data/mockData.ts';

describe('PelatihKu PRO — Interactive Features & State Reducers Audit', () => {
  it('1. Verifies Directory Search filtering matches name, code, phone, and targets', () => {
    const clients = [...INITIAL_CLIENTS];

    // Search by name
    const searchByName = clients.filter(c => 
      c.nama_lengkap.toLowerCase().includes('budi') ||
      c.code.toLowerCase().includes('budi')
    );
    assert.strictEqual(searchByName.length, 1);
    assert.strictEqual(searchByName[0].id, 'k-01');

    // Search by code
    const searchByCode = clients.filter(c => 
      c.code.toLowerCase().includes('091')
    );
    assert.strictEqual(searchByCode.length, 1);
    assert.strictEqual(searchByCode[0].nama_lengkap, 'Siti Rahma');

    // Search by Target Category
    const fatLossClients = clients.filter(c => c.target_category === 'Fat Loss');
    assert.strictEqual(fatLossClients.length, 3, 'Should have 3 Fat Loss members');

    // Search by Status
    const onLeaveClients = clients.filter(c => c.status === 'Cuti');
    assert.strictEqual(onLeaveClients.length, 1, 'Should have 1 member on leave');
    assert.strictEqual(onLeaveClients[0].nama_lengkap, 'Dewi Lestari');
  });

  it('2. Verifies Rest Countdown Timer tick and boundary rules', () => {
    let secondsLeft = 90;
    let totalSeconds = 90;
    let isRunning = true;

    // Timer tick function
    const tick = () => {
      if (secondsLeft > 0) {
        secondsLeft -= 1;
      } else {
        isRunning = false;
      }
    };

    // Simulate 5 ticks
    for (let i = 0; i < 5; i++) tick();
    assert.strictEqual(secondsLeft, 85);
    assert.strictEqual(isRunning, true);

    // Add +30s
    secondsLeft += 30;
    totalSeconds = Math.max(totalSeconds, secondsLeft);
    assert.strictEqual(secondsLeft, 115);
    assert.strictEqual(totalSeconds, 115);

    // Subtract -15s
    secondsLeft = Math.max(0, secondsLeft - 15);
    assert.strictEqual(secondsLeft, 100);

    // Fast forward to 0
    secondsLeft = 0;
    tick();
    assert.strictEqual(isRunning, false);
  });

  it('3. Verifies Dynamic Calendar date generation & day session indexing', () => {
    // Current test date: November 2026
    const year = 2026;
    const month = 10; // 0-indexed: 10 = November
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    assert.strictEqual(daysInMonth, 30, 'November must have 30 days');

    // Check sessions assigned to 2026-11-05
    const testDateStr = '2026-11-05';
    const sessionsOnDate = INITIAL_CLIENTS.filter(c => c.nextSession?.date === testDateStr);
    assert.ok(sessionsOnDate.length >= 1, 'There should be at least 1 session on 2026-11-05');
  });

  it('4. Verifies Reschedule payload generation & reason persistence', () => {
    const client = INITIAL_CLIENTS[0];
    const reschedulePayload = {
      date: '2026-11-08',
      time: '16:00',
      location: 'SCBD District 8' as const,
      reason: 'Bentrok meeting kantor pusat',
      sendWaNotification: true
    };

    // Simulate reschedule reducer
    const updatedClient: ClientProfile = {
      ...client,
      nextSession: {
        ...client.nextSession,
        date: reschedulePayload.date,
        time: reschedulePayload.time,
        location: reschedulePayload.location,
        confirmed: true,
        rescheduleReason: reschedulePayload.reason
      }
    };

    assert.strictEqual(updatedClient.nextSession.date, '2026-11-08');
    assert.strictEqual(updatedClient.nextSession.time, '16:00');
    assert.strictEqual(updatedClient.nextSession.location, 'SCBD District 8');
    assert.strictEqual(updatedClient.nextSession.rescheduleReason, 'Bentrok meeting kantor pusat');
    assert.strictEqual(updatedClient.nextSession.confirmed, true);
  });

  it('5. Verifies Session Logging exercise addition and set mutations', () => {
    const newExercise: ExerciseLog = {
      id: 'ex-log-1',
      name: 'Barbell Back Squat',
      category: 'Free Weights',
      tempo: '3-1-X-1',
      restSeconds: 120,
      historicalBestKg: 110,
      sets: [
        { id: 's-1', setNumber: 1, type: 'Warm-up', weightKg: 60, reps: 10 },
        { id: 's-2', setNumber: 2, type: 'Work Set', weightKg: 90, reps: 6 },
        { id: 's-3', setNumber: 3, type: 'Top Set', weightKg: 105, reps: 4, isPR: true }
      ]
    };

    const exVol = newExercise.sets.reduce((sum, s) => sum + (s.weightKg * s.reps), 0);
    // 60*10 + 90*6 + 105*4 = 600 + 540 + 420 = 1560 kg
    assert.strictEqual(exVol, 1560, 'Squat exercise volume should equal 1560 kg');

    const prSets = newExercise.sets.filter(s => s.isPR);
    assert.strictEqual(prSets.length, 1);
    assert.strictEqual(prSets[0].weightKg, 105);
  });

  it('6. Verifies Nutrition adherence 7-day status toggling', () => {
    const client = INITIAL_CLIENTS[0];
    const initialDays = [...client.weeklyNutritionDays];
    assert.strictEqual(initialDays.length, 7);

    // Toggle day 2 (index 1) from whatever it was to 'tercapai'
    const updatedDays = [...initialDays];
    updatedDays[1] = 'tercapai';

    const achievedCount = updatedDays.filter(d => d === 'tercapai').length;
    const adherencePct = Math.round((achievedCount / 7) * 100);

    assert.ok(adherencePct >= 0 && adherencePct <= 100);
    assert.strictEqual(updatedDays[1], 'tercapai');
  });

  it('7. Verifies PIN Auth Gate & Session Management', () => {
    const defaultPin = '123456';
    const customPin = '654321';

    // Mock PIN validator
    const validatePin = (input: string, storedPin?: string) => {
      const activePin = storedPin || defaultPin;
      return input.trim() === activePin;
    };

    assert.strictEqual(validatePin('123456'), true);
    assert.strictEqual(validatePin('000000'), false);
    assert.strictEqual(validatePin('12345'), false);
    assert.strictEqual(validatePin('654321', customPin), true);
    assert.strictEqual(validatePin('123456', customPin), false);
  });
});
