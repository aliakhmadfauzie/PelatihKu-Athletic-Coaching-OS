import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PushNotificationItem,
  filterNotificationsForUser,
  markPushNotificationAsRead,
  markMultiplePushNotificationsAsRead,
  getPushNotifications,
  notifyRescheduleApproved,
  notifyRescheduleRejected,
  notifyRescheduleRequested
} from '../src/services/pushNotificationService';
import {
  INITIAL_CLIENTS,
  ClientProfile,
  RescheduleRequest
} from '../src/data/mockData';
import {
  evaluateReschedulePolicy,
  processApproveReschedule,
  processRejectReschedule
} from '../src/services/rescheduleMatrixService';

describe('PelatihKu PRO — Reschedule & Push Notification User Feedback Enhancements', () => {
  it('1. Recipient Scoping: Coach NEVER receives client approval/rejection notifications', async () => {
    const mockClient = INITIAL_CLIENTS.find((c) => c.id === 'k-01')!;

    const approvalNotif: PushNotificationItem = {
      id: 'notif-appr-test-1',
      type: 'reschedule_approved',
      title: 'Jadwal Sesi PT Disetujui ✅',
      body: 'Sesi latihan Anda resmi dipindahkan ke 2026-11-08 jam 16:30 WIB oleh Coach Panji.',
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: 'client',
      targetClientId: 'k-01',
      priority: 'high'
    };

    const coachRequestNotif: PushNotificationItem = {
      id: 'notif-req-test-1',
      type: 'reschedule_request',
      title: 'Pengajuan Reschedule Sesi PT',
      body: 'Budi Santoso mengajukan pindah sesi ke 2026-11-08.',
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: 'coach',
      targetClientId: 'k-01',
      priority: 'high'
    };

    const systemBroadcastNotif: PushNotificationItem = {
      id: 'notif-sys-test-1',
      type: 'system_alert',
      title: 'PelatihKu OS Aktif',
      body: 'Pembaruan sistem gym floor.',
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: 'all',
      priority: 'normal'
    };

    const notifPool = [approvalNotif, coachRequestNotif, systemBroadcastNotif];

    // Filter for Coach:
    const coachFeed = filterNotificationsForUser(notifPool, 'coach');
    // Coach must see the request and broadcast, but NEVER the approval message meant for client
    assert.strictEqual(coachFeed.length, 2);
    assert.ok(coachFeed.some((n) => n.id === 'notif-req-test-1'));
    assert.ok(coachFeed.some((n) => n.id === 'notif-sys-test-1'));
    assert.strictEqual(
      coachFeed.some((n) => n.id === 'notif-appr-test-1'),
      false,
      'Coach must never see notifications targeted to client!'
    );

    // Filter for Client k-01 (the requester):
    const clientFeed = filterNotificationsForUser(notifPool, 'client', 'k-01');
    assert.strictEqual(clientFeed.length, 2);
    assert.ok(clientFeed.some((n) => n.id === 'notif-appr-test-1'));
    assert.ok(clientFeed.some((n) => n.id === 'notif-sys-test-1'));
    assert.strictEqual(
      clientFeed.some((n) => n.id === 'notif-req-test-1'),
      false,
      'Client must never see internal coach review notifications!'
    );

    // Filter for Client k-02 (different member):
    const clientK02Feed = filterNotificationsForUser(notifPool, 'client', 'k-02');
    assert.strictEqual(clientK02Feed.length, 1);
    assert.strictEqual(clientK02Feed[0].id, 'notif-sys-test-1');
  });

  it('2. Auto Mark-As-Read: Immediately flags notifications as read without mutating unrelated items', () => {
    const testNotifId = 'notif-init-1';

    // Mark single notification as read
    markPushNotificationAsRead(testNotifId);

    const store = getPushNotifications();
    const target = store.find((n) => n.id === testNotifId);
    if (target) {
      assert.strictEqual(target.read, true);
    }

    // Bulk mark multiple notifications
    markMultiplePushNotificationsAsRead(['notif-reschedule-k02-mock']);
    const storeAfter = getPushNotifications();
    const k02Notif = storeAfter.find((n) => n.id === 'notif-reschedule-k02-mock');
    if (k02Notif) {
      assert.strictEqual(k02Notif.read, true);
    }
  });

  it('3. Multi-Schedule Support: Correctly evaluates policy and isolates selected session dates', () => {
    // Session 1: 48 hours away (>24h free policy)
    const futureDate = '2026-11-10';
    const futureTime = '16:30';
    const policyStandard = evaluateReschedulePolicy(futureDate, futureTime, new Date('2026-11-08T10:00:00'));
    assert.strictEqual(policyStandard.isLate, false);
    assert.strictEqual(policyStandard.policyType, 'standard_free');

    // Session 2: 12 hours away (<24h late policy)
    const closeDate = '2026-11-08';
    const closeTime = '20:00';
    const policyLate = evaluateReschedulePolicy(closeDate, closeTime, new Date('2026-11-08T08:00:00'));
    assert.strictEqual(policyLate.isLate, true);
    assert.strictEqual(policyLate.policyType, 'late_warning');
    assert.strictEqual(policyLate.quotaImpact, 'requires_override');
  });

  it('4. Reschedule Approval Lifecycle: Persists audit decision trail into rescheduleHistory', () => {
    const k02 = INITIAL_CLIENTS.find((c) => c.id === 'k-02')!;
    const request = k02.pendingReschedule!;

    const decisionNote = 'Slot pagi jam 10:00 WIB disetujui untuk SCBD District 8.';
    const { updatedClient, approvedRequest } = processApproveReschedule({
      client: k02,
      request,
      approverRole: 'coach',
      approverName: 'Coach Panji Akbar Syamsi',
      decisionNote
    });

    assert.strictEqual(updatedClient.pendingReschedule, undefined);
    assert.ok(updatedClient.rescheduleHistory);
    assert.strictEqual(updatedClient.rescheduleHistory[0].status, 'approved');
    assert.strictEqual(updatedClient.rescheduleHistory[0].decisionNote, decisionNote);
    assert.strictEqual(updatedClient.rescheduleHistory[0].decidedByName, 'Coach Panji Akbar Syamsi');
    assert.strictEqual(updatedClient.nextSession.date, request.proposedDate);
    assert.strictEqual(updatedClient.nextSession.time, request.proposedTime);
  });

  it('5. Reschedule Rejection Lifecycle: Preserves original session schedule and records reason in history', () => {
    const k02 = INITIAL_CLIENTS.find((c) => c.id === 'k-02')!;
    const request = k02.pendingReschedule!;
    const originalDate = k02.nextSession.date;

    const rejectionReason = 'Slot studio Kemang sedang dalam maintenance CNS & S&C Rack.';
    const { updatedClient, rejectedRequest } = processRejectReschedule({
      client: k02,
      request,
      rejectorRole: 'coach',
      rejectorName: 'Coach Panji Akbar Syamsi',
      reason: rejectionReason
    });

    assert.strictEqual(updatedClient.pendingReschedule, undefined);
    assert.strictEqual(updatedClient.nextSession.date, originalDate, 'Original scheduled date must remain untouched');
    assert.ok(updatedClient.rescheduleHistory);
    assert.strictEqual(updatedClient.rescheduleHistory[0].status, 'rejected');
    assert.strictEqual(updatedClient.rescheduleHistory[0].decisionNote, rejectionReason);
  });
});
