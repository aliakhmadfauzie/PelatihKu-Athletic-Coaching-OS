import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evaluateReschedulePolicy,
  canRequestReschedule,
  canApproveReschedule,
  canRejectReschedule,
  canCancelReschedule,
  createRescheduleRequest,
  processApproveReschedule,
  processRejectReschedule,
  processCancelReschedule
} from '../src/services/rescheduleMatrixService';
import {
  dispatchPushNotification,
  getPushNotifications,
  markPushNotificationAsRead,
  markAllPushNotificationsAsRead,
  clearAllPushNotifications,
  notifyRescheduleRequested,
  notifyRescheduleApproved,
  notifyRescheduleRejected,
  isPushNotificationSupported,
  getPushPermissionState
} from '../src/services/pushNotificationService';
import { INITIAL_CLIENTS, ClientProfile, RescheduleRequest } from '../src/data/mockData';

describe('PelatihKu PRO — Reschedule Approval Matrix & Push Notification Audit', () => {
  const sampleClient: ClientProfile = {
    ...INITIAL_CLIENTS[0],
    nextSession: {
      date: '2026-11-08',
      time: '16:00',
      focus: 'Lower Body Strength & Hypertrophy',
      location: 'Gym Utama Senayan',
      confirmed: true
    }
  };

  it('1. Verifies Reschedule Approval Matrix evaluates standard (>24h) vs late (<24h) lead times', () => {
    // Session on 2026-11-08 at 16:00
    // Case A: Request made 48 hours prior (2026-11-06 16:00)
    const earlyTimestamp = new Date('2026-11-06T16:00:00');
    const earlyPolicy = evaluateReschedulePolicy('2026-11-08', '16:00', earlyTimestamp);
    assert.strictEqual(earlyPolicy.isLate, false);
    assert.strictEqual(earlyPolicy.policyType, 'standard_free');
    assert.strictEqual(earlyPolicy.quotaImpact, 'none');
    assert.ok(earlyPolicy.hoursUntilSession >= 48);

    // Case B: Request made 4 hours prior (2026-11-08 12:00)
    const lateTimestamp = new Date('2026-11-08T12:00:00');
    const latePolicy = evaluateReschedulePolicy('2026-11-08', '16:00', lateTimestamp);
    assert.strictEqual(latePolicy.isLate, true);
    assert.strictEqual(latePolicy.policyType, 'late_warning');
    assert.strictEqual(latePolicy.quotaImpact, 'requires_override');
    assert.strictEqual(latePolicy.hoursUntilSession, 4);

    // Case C: Invalid datetime fallback handles gracefully without crashing
    const fallbackPolicy = evaluateReschedulePolicy('invalid-date', 'invalid-time');
    assert.strictEqual(typeof fallbackPolicy.isLate, 'boolean');
    assert.strictEqual(fallbackPolicy.policyType, 'standard_free');
  });

  it('2. Verifies Reschedule Approval Matrix enforces strict RBAC clearances', () => {
    const memberRequest: RescheduleRequest = {
      id: 'req-01',
      clientId: 'k-01',
      clientName: 'Budi Santoso',
      originalDate: '2026-11-08',
      originalTime: '16:00',
      originalLocation: 'Gym Utama Senayan',
      proposedDate: '2026-11-09',
      proposedTime: '10:00',
      proposedLocation: 'SCBD District 8',
      reason: 'Lembur Kerja',
      requestedAt: new Date().toISOString(),
      requestedByRole: 'client',
      requestedByName: 'Budi Santoso',
      status: 'pending'
    };

    // A: Member CANNOT approve their own reschedule request!
    assert.strictEqual(
      canApproveReschedule('client', memberRequest),
      false,
      'Member must NOT have clearance to self-approve reschedule requests'
    );

    // B: Coach Panji CAN approve member reschedule request
    assert.strictEqual(
      canApproveReschedule('coach', memberRequest),
      true,
      'Coach Panji must have clearance to approve member reschedule requests'
    );

    // C: Admin CAN approve member reschedule request (Supervisory Override)
    assert.strictEqual(
      canApproveReschedule('admin', memberRequest),
      true,
      'Admin must have clearance to approve member reschedule requests'
    );

    // D: Cancellation clearances
    assert.strictEqual(
      canCancelReschedule('client', memberRequest),
      true,
      'Member can cancel their own pending request'
    );
    assert.strictEqual(
      canCancelReschedule('admin', memberRequest),
      true,
      'Admin can cancel any pending request'
    );
    assert.strictEqual(
      canCancelReschedule('coach', memberRequest),
      false,
      'Coach cannot cancel a request initiated by member (only approve or reject)'
    );
  });

  it('3. Verifies createRescheduleRequest constructs properly typed request with policy metadata', () => {
    const request = createRescheduleRequest({
      client: sampleClient,
      proposedDate: '2026-11-10',
      proposedTime: '18:30',
      proposedLocation: 'SCBD District 8',
      reason: 'Jadwal Bentrok',
      requestedByRole: 'client',
      requestedByName: 'Budi Santoso'
    });

    assert.ok(request.id.startsWith('rsch-'));
    assert.strictEqual(request.clientId, sampleClient.id);
    assert.strictEqual(request.originalDate, '2026-11-08');
    assert.strictEqual(request.originalTime, '16:00');
    assert.strictEqual(request.proposedDate, '2026-11-10');
    assert.strictEqual(request.proposedTime, '18:30');
    assert.strictEqual(request.proposedLocation, 'SCBD District 8');
    assert.strictEqual(request.status, 'pending');
    assert.strictEqual(typeof request.isLateRequest, 'boolean');
  });

  it('4. Verifies processApproveReschedule updates nextSession and logs audit trail', () => {
    const request = createRescheduleRequest({
      client: sampleClient,
      proposedDate: '2026-11-12',
      proposedTime: '10:00',
      proposedLocation: 'Private Studio Kemang',
      reason: 'Recovery',
      requestedByRole: 'client',
      requestedByName: 'Budi Santoso'
    });

    const clientWithPending: ClientProfile = {
      ...sampleClient,
      pendingReschedule: request
    };

    // Unauthorized approve by member should throw error
    assert.throws(
      () =>
        processApproveReschedule({
          client: clientWithPending,
          request,
          approverRole: 'client',
          approverName: 'Budi Santoso'
        }),
      /tidak memiliki otorisasi/i
    );

    // Authorized approve by Coach Panji
    const { updatedClient, approvedRequest } = processApproveReschedule({
      client: clientWithPending,
      request,
      approverRole: 'coach',
      approverName: 'Coach Panji Akbar Syamsi',
      decisionNote: 'Slot studio disetujui untuk pemulihan.'
    });

    // Verification: nextSession is updated
    assert.strictEqual(updatedClient.nextSession.date, '2026-11-12');
    assert.strictEqual(updatedClient.nextSession.time, '10:00');
    assert.strictEqual(updatedClient.nextSession.location, 'Private Studio Kemang');
    assert.strictEqual(updatedClient.nextSession.confirmed, true);

    // Verification: pendingReschedule is cleared
    assert.strictEqual(updatedClient.pendingReschedule, undefined);

    // Verification: rescheduleHistory audit trail is recorded
    assert.ok(updatedClient.rescheduleHistory);
    assert.strictEqual(updatedClient.rescheduleHistory.length, 1);
    assert.strictEqual(updatedClient.rescheduleHistory[0].status, 'approved');
    assert.strictEqual(updatedClient.rescheduleHistory[0].decidedByRole, 'coach');
    assert.strictEqual(updatedClient.rescheduleHistory[0].decidedByName, 'Coach Panji Akbar Syamsi');
  });

  it('5. Verifies processRejectReschedule preserves original schedule and records rejection reason', () => {
    const request = createRescheduleRequest({
      client: sampleClient,
      proposedDate: '2026-11-09',
      proposedTime: '17:00',
      proposedLocation: 'Gym Utama Senayan',
      reason: 'Lembur',
      requestedByRole: 'client',
      requestedByName: 'Budi Santoso'
    });

    const clientWithPending: ClientProfile = {
      ...sampleClient,
      pendingReschedule: request
    };

    const { updatedClient, rejectedRequest } = processRejectReschedule({
      client: clientWithPending,
      request,
      rejectorRole: 'admin',
      rejectorName: 'Gym Operations Manager',
      reason: 'Slot penuh untuk jam puncak 17:00'
    });

    // Verification: original schedule is preserved!
    assert.strictEqual(updatedClient.nextSession.date, '2026-11-08');
    assert.strictEqual(updatedClient.nextSession.time, '16:00');
    assert.strictEqual(updatedClient.nextSession.location, 'Gym Utama Senayan');

    // Verification: pending is cleared and history holds rejection note
    assert.strictEqual(updatedClient.pendingReschedule, undefined);
    assert.strictEqual(updatedClient.rescheduleHistory?.length, 1);
    assert.strictEqual(updatedClient.rescheduleHistory?.[0].status, 'rejected');
    assert.strictEqual(updatedClient.rescheduleHistory?.[0].decisionNote, 'Slot penuh untuk jam puncak 17:00');
  });

  it('6. Verifies processCancelReschedule handles requester cancellation cleanly', () => {
    const request = createRescheduleRequest({
      client: sampleClient,
      proposedDate: '2026-11-10',
      proposedTime: '10:00',
      proposedLocation: 'Gym Utama Senayan',
      reason: 'Sakit',
      requestedByRole: 'client',
      requestedByName: 'Budi Santoso'
    });

    const clientWithPending: ClientProfile = {
      ...sampleClient,
      pendingReschedule: request
    };

    const { updatedClient, cancelledRequest } = processCancelReschedule({
      client: clientWithPending,
      request,
      cancellerRole: 'client'
    });

    assert.strictEqual(updatedClient.pendingReschedule, undefined);
    assert.strictEqual(cancelledRequest.status, 'cancelled');
    assert.strictEqual(updatedClient.rescheduleHistory?.[0].status, 'cancelled');
  });

  it('7. Verifies Push Notification Service handles dispatch, read markers, and in-app store', async () => {
    clearAllPushNotifications();
    assert.strictEqual(getPushNotifications().length, 0);

    // 1. Dispatch custom notification
    const testNotif = await dispatchPushNotification({
      type: 'session_reminder',
      title: 'Pengingat Sesi PT Besok ⏰',
      body: 'Sesi latihan Anda dijadwalkan besok jam 16:30 WIB di Gym Utama Senayan.',
      priority: 'high'
    });

    assert.ok(testNotif.id);
    assert.strictEqual(testNotif.read, false);
    assert.strictEqual(getPushNotifications().length, 1);

    // 2. Mark as read
    markPushNotificationAsRead(testNotif.id);
    assert.strictEqual(getPushNotifications()[0].read, true);

    // 3. Mark all as read
    await dispatchPushNotification({
      type: 'system_alert',
      title: 'Update Sistem',
      body: 'Pembaruan PWA PelatihKu selesai.',
      priority: 'normal'
    });
    assert.strictEqual(getPushNotifications().filter((n) => !n.read).length, 1);
    markAllPushNotificationsAsRead();
    assert.strictEqual(getPushNotifications().filter((n) => !n.read).length, 0);
  });

  it('8. Verifies specialized Push Notification trigger helpers format professional copy', async () => {
    const request = createRescheduleRequest({
      client: sampleClient,
      proposedDate: '2026-11-15',
      proposedTime: '16:30',
      proposedLocation: 'Gym Utama Senayan',
      reason: 'Recovery',
      requestedByRole: 'client',
      requestedByName: 'Budi Santoso'
    });

    // A: notifyRescheduleRequested
    const reqNotif = await notifyRescheduleRequested(request);
    assert.strictEqual(reqNotif.type, 'reschedule_request');
    assert.match(reqNotif.title, /Reschedule/i);
    assert.match(reqNotif.body, /Budi Santoso/);

    // B: notifyRescheduleApproved
    const appNotif = await notifyRescheduleApproved(request, 'Coach Panji Akbar Syamsi');
    assert.strictEqual(appNotif.type, 'reschedule_approved');
    assert.match(appNotif.title, /Disetujui/i);
    assert.match(appNotif.body, /Panji Akbar Syamsi/);

    // C: notifyRescheduleRejected
    const rejNotif = await notifyRescheduleRejected(
      request,
      'Supervisor Gym',
      'Jadwal bertabrakan dengan workshop'
    );
    assert.strictEqual(rejNotif.type, 'reschedule_rejected');
    assert.match(rejNotif.title, /Ditolak/i);
    assert.match(rejNotif.body, /Supervisor Gym/);
  });

  it('9. Verifies INITIAL_CLIENTS has active sample pendingReschedule on k-02 for instant review popup', () => {
    const k02 = INITIAL_CLIENTS.find((c) => c.id === 'k-02');
    assert.ok(k02, 'Member k-02 (Siti Rahmawati) must exist');
    assert.ok(k02.pendingReschedule, 'Member k-02 must have pendingReschedule request');
    assert.strictEqual(k02.pendingReschedule.status, 'pending');
    assert.strictEqual(k02.pendingReschedule.clientId, 'k-02');
    assert.strictEqual(k02.pendingReschedule.requestedByRole, 'client');
    assert.strictEqual(k02.pendingReschedule.proposedDate, '2026-11-07');
    assert.strictEqual(k02.pendingReschedule.proposedTime, '10:00');
    assert.strictEqual(k02.pendingReschedule.proposedLocation, 'SCBD District 8');
    assert.match(k02.pendingReschedule.reason, /Meeting dadakan/i);
  });

  it('10. Verifies Review Popup decision flows: decision note recording and WhatsApp URL formatting', () => {
    const k02 = INITIAL_CLIENTS.find((c) => c.id === 'k-02')!;
    const request = k02.pendingReschedule!;

    // 1. Approve flow with custom note
    const { updatedClient: approvedClient, approvedRequest } = processApproveReschedule({
      client: k02,
      request,
      approverRole: 'coach',
      approverName: 'Coach Panji Akbar Syamsi',
      decisionNote: 'Slot pagi 10:00 di SCBD disetujui. S&C Rack 2 dialokasikan.'
    });

    assert.strictEqual(approvedClient.nextSession.date, '2026-11-07');
    assert.strictEqual(approvedClient.nextSession.time, '10:00');
    assert.strictEqual(approvedRequest.decisionNote, 'Slot pagi 10:00 di SCBD disetujui. S&C Rack 2 dialokasikan.');

    // 2. WhatsApp URL verification for prompt follow-up
    const cleanPhone = (k02.telepon || '').replace(/\D/g, '');
    const waText = `Halo ${k02.nama_lengkap}, menindaklanjuti permohonan reschedule sesi latihan Anda`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;
    assert.ok(waUrl.includes('6281234567802'));
    assert.ok(waUrl.includes('menindaklanjuti'));
  });

  it('11. Verifies Notification-to-Review-Popup payload integrity and Schedule View Alerts', async () => {
    // 1. Verify push notification contains full request object and actionUrl
    const k02 = INITIAL_CLIENTS.find((c) => c.id === 'k-02')!;
    const request = k02.pendingReschedule!;

    const notif = await notifyRescheduleRequested(request);
    assert.strictEqual(notif.type, 'reschedule_request');
    assert.strictEqual(notif.actionUrl, '/?reviewReschedule=k-02');
    assert.ok(notif.metadata?.request, 'Notification must contain full request metadata');
    assert.strictEqual(notif.metadata?.request?.id, request.id);
    assert.strictEqual(notif.metadata?.request?.proposedDate, '2026-11-07');

    // 2. Verify all notifications in store include an actionable reschedule request
    const allNotifs = getPushNotifications();
    const rescheduleNotif = allNotifs.find((n) => n.type === 'reschedule_request');
    assert.ok(rescheduleNotif, 'Push Notification Store must include an actionable reschedule request');
    assert.ok(
      rescheduleNotif.targetClientId === 'k-02' || rescheduleNotif.metadata?.clientId === 'k-02',
      'Target client ID must be k-02'
    );

    // 3. Verify Schedule View pending reschedule computation across all clients
    const pendingRequests = INITIAL_CLIENTS
      .filter((c) => c.pendingReschedule && c.pendingReschedule.status === 'pending')
      .map((c) => ({
        client: c,
        request: c.pendingReschedule!
      }));

    assert.ok(pendingRequests.length >= 1, 'Schedule View must detect at least 1 pending reschedule');
    assert.strictEqual(pendingRequests[0].client.id, 'k-02');
    assert.strictEqual(pendingRequests[0].request.proposedLocation, 'SCBD District 8');
  });
});
