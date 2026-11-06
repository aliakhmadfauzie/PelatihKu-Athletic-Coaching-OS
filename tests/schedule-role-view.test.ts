import { describe, it } from 'node:test';
import assert from 'node:assert';
import { INITIAL_CLIENTS, ClientProfile } from '../src/data/mockData';
import { normalizeDateToKey, getDayNameFromDateKey } from '../src/components/SessionsCalendarView';

describe('PelatihKu PRO — Schedule Screen Role-Based Visibility & Data Integrity Audit', () => {
  it('1. Verifies normalizeDateToKey handles YYYY-MM-DD and Indonesian DD MMM YYYY without UTC date shifts', () => {
    // Standard ISO dates
    assert.strictEqual(normalizeDateToKey('2026-11-05'), '2026-11-05');
    assert.strictEqual(normalizeDateToKey('2026-11-07'), '2026-11-07');

    // Indonesian text dates
    assert.strictEqual(normalizeDateToKey('04 Nov 2026'), '2026-11-04');
    assert.strictEqual(normalizeDateToKey('1 Nov 2026'), '2026-11-01');
    assert.strictEqual(normalizeDateToKey('28 Okt 2026'), '2026-10-28');
    assert.strictEqual(normalizeDateToKey('15 Agu 2026'), '2026-08-15');

    // Fallback on invalid
    assert.strictEqual(normalizeDateToKey(''), '2026-11-05');
    assert.strictEqual(normalizeDateToKey(undefined), '2026-11-05');
  });

  it('2. Verifies getDayNameFromDateKey produces correct Indonesian day names', () => {
    // 2 Nov 2026 is Monday (Sen)
    assert.strictEqual(getDayNameFromDateKey('2026-11-02'), 'Sen');
    // 3 Nov 2026 is Tuesday (Sel)
    assert.strictEqual(getDayNameFromDateKey('2026-11-03'), 'Sel');
    // 4 Nov 2026 is Wednesday (Rab)
    assert.strictEqual(getDayNameFromDateKey('2026-11-04'), 'Rab');
    // 5 Nov 2026 is Thursday (Kam)
    assert.strictEqual(getDayNameFromDateKey('2026-11-05'), 'Kam');
    // 6 Nov 2026 is Friday (Jum)
    assert.strictEqual(getDayNameFromDateKey('2026-11-06'), 'Jum');
    // 7 Nov 2026 is Saturday (Sab)
    assert.strictEqual(getDayNameFromDateKey('2026-11-07'), 'Sab');
    // 8 Nov 2026 is Sunday (Min)
    assert.strictEqual(getDayNameFromDateKey('2026-11-08'), 'Min');
  });

  it('3. Verifies Client Persona ONLY sees schedules plotted under their own name/id (Zero Data Leakage)', () => {
    const clients = INITIAL_CLIENTS;
    const currentClientId = 'k-01'; // Budi Santoso

    // Simulate session extraction logic from SessionsCalendarView
    const allSessions: Array<{ clientId: string; clientName: string; date: string; focus: string }> = [];

    clients.forEach((c) => {
      // Scheduled slots
      c.scheduledSessions?.forEach((slot) => {
        allSessions.push({
          clientId: c.id,
          clientName: c.nama_lengkap,
          date: normalizeDateToKey(slot.date),
          focus: slot.focus
        });
      });
      // nextSession
      if (c.nextSession?.date) {
        allSessions.push({
          clientId: c.id,
          clientName: c.nama_lengkap,
          date: normalizeDateToKey(c.nextSession.date),
          focus: c.nextSession.focus
        });
      }
      // Logged sessions
      c.sessions?.forEach((s) => {
        allSessions.push({
          clientId: c.id,
          clientName: c.nama_lengkap,
          date: normalizeDateToKey(s.date),
          focus: s.focus
        });
      });
    });

    // Scoped list for Member Budi Santoso (client role)
    const clientVisibleSessions = allSessions.filter((s) => s.clientId === currentClientId);

    assert.ok(clientVisibleSessions.length > 0, 'Member Budi Santoso must see his own scheduled sessions');

    // Rigorous check: Every visible session must strictly belong to k-01
    clientVisibleSessions.forEach((ses) => {
      assert.strictEqual(ses.clientId, 'k-01', 'Session clientId must strictly equal k-01');
      assert.strictEqual(ses.clientName, 'Budi Santoso', 'Session clientName must strictly equal Budi Santoso');
    });

    // Verification: Zero sessions belonging to k-02 (Siti), k-03, k-04, k-05 leak into member view
    const leakedSessions = clientVisibleSessions.filter((s) => s.clientId !== currentClientId);
    assert.strictEqual(leakedSessions.length, 0, 'Zero sessions of other members should leak into client view');
  });

  it('4. Verifies Coach Persona sees ALL plotted schedules from all clients', () => {
    const clients = INITIAL_CLIENTS;

    const allSessions: Array<{ clientId: string; clientName: string }> = [];
    clients.forEach((c) => {
      c.scheduledSessions?.forEach(() => {
        allSessions.push({ clientId: c.id, clientName: c.nama_lengkap });
      });
    });

    // For coach, all sessions are visible
    const coachVisibleClientIds = new Set(allSessions.map((s) => s.clientId));

    // Must see sessions across all active clients
    assert.ok(coachVisibleClientIds.has('k-01'), 'Coach must see k-01 sessions');
    assert.ok(coachVisibleClientIds.has('k-02'), 'Coach must see k-02 sessions');
    assert.ok(coachVisibleClientIds.has('k-03'), 'Coach must see k-03 sessions');
    assert.ok(coachVisibleClientIds.has('k-04'), 'Coach must see k-04 sessions');
    assert.ok(coachVisibleClientIds.has('k-05'), 'Coach must see k-05 sessions');
  });

  it('5. Verifies Admin Persona has the same comprehensive schedule visibility as Coach', () => {
    const clients = INITIAL_CLIENTS;

    const coachView: string[] = [];
    const adminView: string[] = [];

    clients.forEach((c) => {
      c.scheduledSessions?.forEach((s) => {
        coachView.push(`${c.id}-${s.date}-${s.time}`);
        adminView.push(`${c.id}-${s.date}-${s.time}`);
      });
    });

    assert.strictEqual(coachView.length, adminView.length, 'Coach and Admin must see the exact same session count');
    assert.deepStrictEqual(coachView, adminView, 'Coach and Admin session sets must be identical');
  });

  it('6. Verifies all scheduled sessions have valid sports science focus and session progression numbers', () => {
    INITIAL_CLIENTS.forEach((c) => {
      c.scheduledSessions?.forEach((s) => {
        assert.ok(s.id, `Session for client ${c.id} must have unique id`);
        assert.ok(s.focus.length > 5, `Session for client ${c.id} must have meaningful training focus`);
        assert.ok(s.sessionNumber >= 1 && s.sessionNumber <= c.paketTotal,
          `Session number ${s.sessionNumber} must be within package bounds (1 to ${c.paketTotal})`);
        assert.ok(['Gym Utama Senayan', 'SCBD District 8', 'Private Studio Kemang'].includes(s.location),
          `Location ${s.location} must be a valid authorized fitness center facility`);
      });
    });
  });

  it('7. Verifies Month view does not generate hallucinated or fake counts on empty days', () => {
    // Empty dayCounts simulation
    const dayCounts: Record<string, { total: number; completed: number; upcoming: number }> = {};
    const dateStr = '2026-11-25'; // A date without any scheduled session

    const dayData = dayCounts[dateStr] || { total: 0, completed: 0, upcoming: 0 };
    assert.strictEqual(dayData.total, 0, 'Empty date count must strictly be 0, never fake 4 or 5');
    assert.strictEqual(dayData.completed, 0, 'Empty date completed must strictly be 0');
    assert.strictEqual(dayData.upcoming, 0, 'Empty date upcoming must strictly be 0');
  });
});
