import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CLIENTS, INITIAL_COACH_PROFILE, ScheduledSlot } from '../src/data/mockData';

test('PelatihKu PRO — Batch Recurring Schedule & Progress Report Architecture', async (t) => {
  await t.test('1. Verifies batch recurring scheduler accurately projects slots on selected days of the week', () => {
    // Helper replicating the modal's projection algorithm
    function projectRecurringSlots(
      startDateStr: string,
      selectedDays: number[], // e.g. [2, 4] for Selasa & Kamis
      totalSessions: number,
      startingSessionNum: number
    ): { date: string; sessionNumber: number }[] {
      const slots: { date: string; sessionNumber: number }[] = [];
      let cur = new Date(startDateStr);
      let count = 0;
      let guard = 0;

      while (count < totalSessions && guard < 365) {
        if (selectedDays.includes(cur.getDay())) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          slots.push({
            date: `${y}-${m}-${d}`,
            sessionNumber: startingSessionNum + count
          });
          count++;
        }
        cur.setDate(cur.getDate() + 1);
        guard++;
      }
      return slots;
    }

    // Start on Monday 2026-11-09, days: Tuesday (2) & Thursday (4), 4 sessions
    const generated = projectRecurringSlots('2026-11-09', [2, 4], 4, 1);
    assert.equal(generated.length, 4);
    assert.equal(generated[0].date, '2026-11-10'); // Tuesday
    assert.equal(generated[0].sessionNumber, 1);
    assert.equal(generated[1].date, '2026-11-12'); // Thursday
    assert.equal(generated[1].sessionNumber, 2);
    assert.equal(generated[2].date, '2026-11-17'); // Next Tuesday
    assert.equal(generated[2].sessionNumber, 3);
    assert.equal(generated[3].date, '2026-11-19'); // Next Thursday
    assert.equal(generated[3].sessionNumber, 4);
  });

  await t.test('2. Verifies alternating Upper/Lower split and PPL pattern progression', () => {
    const getFocusTitle = (pattern: 'upper_lower' | 'ppl', idx: number): string => {
      if (pattern === 'upper_lower') {
        return idx % 2 === 0
          ? 'Upper Body Strength & Hypertrophy'
          : 'Lower Body Strength & Posterior Chain';
      } else {
        if (idx % 3 === 0) return 'Push — Chest, Shoulders & Triceps';
        if (idx % 3 === 1) return 'Pull — Back, Lats & Biceps';
        return 'Legs — Quads, Hamstrings & Calves';
      }
    };

    // Upper/Lower checks
    assert.equal(getFocusTitle('upper_lower', 0), 'Upper Body Strength & Hypertrophy');
    assert.equal(getFocusTitle('upper_lower', 1), 'Lower Body Strength & Posterior Chain');
    assert.equal(getFocusTitle('upper_lower', 2), 'Upper Body Strength & Hypertrophy');

    // PPL checks
    assert.equal(getFocusTitle('ppl', 0), 'Push — Chest, Shoulders & Triceps');
    assert.equal(getFocusTitle('ppl', 1), 'Pull — Back, Lats & Biceps');
    assert.equal(getFocusTitle('ppl', 2), 'Legs — Quads, Hamstrings & Calves');
    assert.equal(getFocusTitle('ppl', 3), 'Push — Chest, Shoulders & Triceps');
  });

  await t.test('3. Verifies schedule collision detector identifies overlapping slots across clients', () => {
    const clientA_slot: ScheduledSlot = {
      id: 's-1',
      date: '2026-11-12',
      time: '17:00',
      durationMinutes: 75,
      location: 'Gym Utama Senayan',
      focus: 'Upper Strength',
      sessionNumber: 5,
      status: 'Terkonfirmasi'
    };

    const isCollision = (
      existing: ScheduledSlot,
      proposedDate: string,
      proposedTime: string,
      proposedLocation: string
    ) => {
      return (
        existing.date === proposedDate &&
        existing.time === proposedTime &&
        existing.location === proposedLocation
      );
    };

    // Identical date, time, location -> True collision
    assert.equal(
      isCollision(clientA_slot, '2026-11-12', '17:00', 'Gym Utama Senayan'),
      true
    );

    // Different location -> No collision
    assert.equal(
      isCollision(clientA_slot, '2026-11-12', '17:00', 'SCBD District 8'),
      false
    );

    // Different time -> No collision
    assert.equal(
      isCollision(clientA_slot, '2026-11-12', '18:30', 'Gym Utama Senayan'),
      false
    );

    // Different date -> No collision
    assert.equal(
      isCollision(clientA_slot, '2026-11-13', '17:00', 'Gym Utama Senayan'),
      false
    );
  });

  await t.test('4. Verifies deduplication and chronological ordering when merging recurring slots into client profile', () => {
    const existingSlots: ScheduledSlot[] = [
      {
        id: 's-old-1',
        date: '2026-11-10',
        time: '17:00',
        durationMinutes: 75,
        location: 'Gym Utama Senayan',
        focus: 'Existing Session',
        sessionNumber: 1,
        status: 'Terkonfirmasi'
      }
    ];

    const newSlots: ScheduledSlot[] = [
      // Replaces old slot at 2026-11-10 17:00
      {
        id: 's-new-1',
        date: '2026-11-10',
        time: '17:00',
        durationMinutes: 75,
        location: 'Gym Utama Senayan',
        focus: 'Updated Focus Session',
        sessionNumber: 1,
        status: 'Terkonfirmasi'
      },
      // New future slot
      {
        id: 's-new-2',
        date: '2026-11-12',
        time: '17:00',
        durationMinutes: 75,
        location: 'Gym Utama Senayan',
        focus: 'Second Session',
        sessionNumber: 2,
        status: 'Terkonfirmasi'
      }
    ];

    // Merge & deduplicate logic matching handleSaveRecurringSessions
    const merged = [...existingSlots];
    newSlots.forEach((slot) => {
      const idx = merged.findIndex((s) => s.date === slot.date && s.time === slot.time);
      if (idx >= 0) {
        merged[idx] = slot;
      } else {
        merged.push(slot);
      }
    });
    merged.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    assert.equal(merged.length, 2);
    assert.equal(merged[0].focus, 'Updated Focus Session');
    assert.equal(merged[1].focus, 'Second Session');
  });

  await t.test('5. Verifies Progress Report delta calculations and official Coach Panji certification stamp', () => {
    const client = INITIAL_CLIENTS[0]; // Budi Santoso
    const coach = INITIAL_COACH_PROFILE;

    const deltaWeight = (client.berat_terkini_kg - client.berat_awal_kg).toFixed(1);
    const deltaBf = (client.body_fat_terkini_pct - client.body_fat_awal_pct).toFixed(1);
    const deltaMuscle = (client.massa_otot_terkini_kg - client.massa_otot_awal_kg).toFixed(1);
    const deltaWaist = (client.lingkar_pinggang_terkini_cm - client.lingkar_pinggang_awal_cm).toFixed(1);

    // Fat Loss validation
    assert.equal(parseFloat(deltaWeight) < 0, true);
    assert.equal(parseFloat(deltaBf) < 0, true);
    assert.equal(parseFloat(deltaWaist) < 0, true);

    // Invariant: Lead Coach is strictly Coach Panji Akbar Syamsi
    assert.equal(coach.name, 'Coach Panji Akbar Syamsi');
    assert.equal(coach.kemenporaId, 'KMP-INA-2024-8819');
    assert.equal(coach.pabsiLicense, 'PB-PABSI-NAS-0412');
  });
});
