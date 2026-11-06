import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  InMemoryNotificationRepository,
  DeviceTokenService,
  NotificationDispatchService,
  MemoryAsyncNotificationQueue,
  FcmPushProviderClient,
  validatePayloadSize
} from '../src/server/notifications/index';

describe('PelatihKu PRO — RBAC Push Notification & Device Token Engine', () => {
  it('1. Idempotently registers device tokens and allows multiple active devices per user', async () => {
    const repo = new InMemoryNotificationRepository();
    const service = new DeviceTokenService(repo);

    // Register primary iPhone
    const dev1 = await service.registerDevice('pas_coach', {
      token: 'fcm_token_coach_iphone_12345',
      platform: 'IOS'
    });

    assert.strictEqual(dev1.user_id, 'pas_coach');
    assert.strictEqual(dev1.platform, 'IOS');
    assert.strictEqual(dev1.is_active, true);

    // Register secondary iPad (multi-device support)
    const dev2 = await service.registerDevice('pas_coach', {
      token: 'fcm_token_coach_ipad_67890',
      platform: 'IOS'
    });

    const userTokens = await service.getUserTokens('pas_coach');
    assert.strictEqual(userTokens.length, 2);
    assert.strictEqual(userTokens.every((t) => t.is_active), true);

    // Idempotent re-registration of dev1 with updated platform or refresh
    const dev1Updated = await service.registerDevice('pas_coach', {
      token: 'fcm_token_coach_iphone_12345',
      platform: 'IOS'
    });

    assert.strictEqual(dev1Updated.id, dev1.id);
    assert.strictEqual(dev1Updated.is_active, true);
    assert.ok(new Date(dev1Updated.last_used_at).getTime() >= new Date(dev1.last_used_at).getTime());

    // Total count remains 2 (zero duplicate records)
    const userTokensAfter = await service.getUserTokens('pas_coach');
    assert.strictEqual(userTokensAfter.length, 2);
  });

  it('2. Automatically transfers device token ownership when a new user signs in on the same device', async () => {
    const repo = new InMemoryNotificationRepository();
    const service = new DeviceTokenService(repo);

    const sharedDeviceToken = 'fcm_tablet_gym_floor_shared_999';

    // Member 1 signs in on gym tablet
    await service.registerDevice('k-01', {
      token: sharedDeviceToken,
      platform: 'ANDROID'
    });

    let tokensK01 = await service.getUserTokens('k-01');
    assert.strictEqual(tokensK01.length, 1);
    assert.strictEqual(tokensK01[0].token, sharedDeviceToken);

    // Member 2 logs into the same physical gym tablet
    await service.registerDevice('k-02', {
      token: sharedDeviceToken,
      platform: 'ANDROID'
    });

    // Device token is now reassigned to Member 2
    tokensK01 = await service.getUserTokens('k-01');
    const tokensK02 = await service.getUserTokens('k-02');

    assert.strictEqual(tokensK01.length, 0);
    assert.strictEqual(tokensK02.length, 1);
    assert.strictEqual(tokensK02[0].user_id, 'k-02');
  });

  it('3. Safely de-registers device tokens with strict user ownership scoping', async () => {
    const repo = new InMemoryNotificationRepository();
    const service = new DeviceTokenService(repo);

    const token = 'fcm_token_to_unregister_abc';
    await service.registerDevice('k-01', {
      token,
      platform: 'WEB'
    });

    // Attacker or another user tries to unregister someone else's token
    const unauthorizedAttempt = await service.unregisterDevice('k-02', token);
    assert.strictEqual(unauthorizedAttempt, false);

    // Verify token is still active for k-01
    let tokens = await service.getUserTokens('k-01');
    assert.strictEqual(tokens[0].is_active, true);

    // Owner unregisters their own token
    const ownerSuccess = await service.unregisterDevice('k-01', token);
    assert.strictEqual(ownerSuccess, true);

    tokens = await service.getUserTokens('k-01');
    assert.strictEqual(tokens[0].is_active, false);
  });

  it('4. RBAC Matrix: Distinguishes between Admin, Coach, and Client permissions', async () => {
    const repo = new InMemoryNotificationRepository();

    // 1. Admin permissions
    const adminProfile = await repo.getUserWithPermissions('gym_admin');
    assert.ok(adminProfile);
    assert.ok(adminProfile.permissions.includes('notifications:broadcast'));
    assert.ok(adminProfile.permissions.includes('notifications:send_role'));
    assert.ok(adminProfile.permissions.includes('notifications:send_direct'));

    // 2. Coach permissions
    const coachProfile = await repo.getUserWithPermissions('pas_coach');
    assert.ok(coachProfile);
    assert.ok(coachProfile.permissions.includes('notifications:send_role'));
    assert.ok(coachProfile.permissions.includes('notifications:send_direct'));
    // Coach CANNOT broadcast to all gym users
    assert.strictEqual(coachProfile.permissions.includes('notifications:broadcast'), false);

    // 3. Client permissions
    const clientProfile = await repo.getUserWithPermissions('k-01');
    assert.ok(clientProfile);
    assert.strictEqual(clientProfile.permissions.length, 0);
  });

  it('5. Audience Resolution: Strictly excludes suspended users from receiving notifications', async () => {
    const repo = new InMemoryNotificationRepository();
    const service = new DeviceTokenService(repo);

    // Register active token for active client k-01
    await service.registerDevice('k-01', {
      token: 'token_active_client_k01',
      platform: 'IOS'
    });

    // Register active token for active client k-02
    await service.registerDevice('k-02', {
      token: 'token_active_client_k02',
      platform: 'ANDROID'
    });

    // Register active token for suspended client k-suspended
    await service.registerDevice('k-suspended', {
      token: 'token_suspended_client_bad',
      platform: 'IOS'
    });

    // Resolve audience for role 'client'
    const audienceTokens = await repo.findActiveTokensByRole('client');

    assert.ok(audienceTokens.includes('token_active_client_k01'));
    assert.ok(audienceTokens.includes('token_active_client_k02'));
    // CRITICAL: Suspended member's token must NEVER be returned in audience queries
    assert.strictEqual(audienceTokens.includes('token_suspended_client_bad'), false);
  });

  it('6. Payload Validation: Rejects payloads exceeding the 4KB (4,096 bytes) provider limit', () => {
    const validPayload = {
      title: 'Pengingat Sesi PT',
      body: 'Sesi latihan Anda dijadwalkan besok pukul 09:00 WIB di SCBD District 8.',
      data: { sessionId: 'sess-123' }
    };

    assert.doesNotThrow(() => {
      validatePayloadSize(validPayload);
    });

    const bloatedString = 'A'.repeat(4500);
    const oversizedPayload = {
      title: 'Oversized Notification',
      body: bloatedString
    };

    assert.throws(
      () => {
        validatePayloadSize(oversizedPayload);
      },
      /exceeds maximum allowable provider limit of 4096 bytes/i
    );
  });

  it('7. Decoupled Dispatch Pipeline: Processes multicast batches and automatically prunes dead tokens', async () => {
    const repo = new InMemoryNotificationRepository();
    const deviceService = new DeviceTokenService(repo);
    const queue = new MemoryAsyncNotificationQueue();
    const provider = new FcmPushProviderClient();

    const dispatchService = new NotificationDispatchService(
      repo,
      deviceService,
      queue,
      provider
    );

    // Register 3 tokens: 2 valid, 1 dead
    await deviceService.registerDevice('k-01', {
      token: 'fcm_valid_k01_tok',
      platform: 'IOS'
    });
    await deviceService.registerDevice('k-02', {
      token: 'fcm_valid_k02_tok',
      platform: 'ANDROID'
    });
    await deviceService.registerDevice('k-01', {
      token: 'fcm_dead_unregistered_tok_xyz',
      platform: 'WEB'
    });

    // Mark the 3rd token as simulating FCM 'messaging/registration-token-not-registered'
    provider.addDeadTokensForTesting(['fcm_dead_unregistered_tok_xyz']);

    const audience = await dispatchService.resolveAudienceByRole('client');
    assert.strictEqual(audience.length, 3);

    // Enqueue dispatch asynchronously
    const enqueueResult = await dispatchService.enqueueDispatch(audience, {
      title: 'Jadwal Baru Dikonfirmasi',
      body: 'Coach Panji Akbar Syamsi telah menyetujui jadwal latihan Anda.'
    });

    assert.strictEqual(enqueueResult.enqueued, true);
    assert.strictEqual(enqueueResult.recipientCount, 3);
    assert.ok(enqueueResult.jobId.startsWith('job_'));

    // Allow asynchronous worker to drain queue
    await queue.drain();

    // Verify Provider Feedback Loop: Dead token must have been pruned (is_active = false)
    const k01TokensAfter = await deviceService.getUserTokens('k-01');
    const validTok = k01TokensAfter.find((t) => t.token === 'fcm_valid_k01_tok');
    const deadTok = k01TokensAfter.find((t) => t.token === 'fcm_dead_unregistered_tok_xyz');

    assert.ok(validTok);
    assert.strictEqual(validTok.is_active, true);

    assert.ok(deadTok);
    assert.strictEqual(deadTok.is_active, false); // Automatically deactivated by feedback loop!

    // Next audience query should now only contain the 2 valid active tokens
    const audienceAfterPrune = await dispatchService.resolveAudienceByRole('client');
    assert.strictEqual(audienceAfterPrune.length, 2);
    assert.strictEqual(audienceAfterPrune.includes('fcm_dead_unregistered_tok_xyz'), false);
  });

  it('8. Express Route Handlers: Registers and unregisters devices with authentication context', async () => {
    const { createPushNotificationRouter } = await import('../src/server/notifications/index');

    const repo = new InMemoryNotificationRepository();
    const deviceService = new DeviceTokenService(repo);
    const queue = new MemoryAsyncNotificationQueue();
    const provider = new FcmPushProviderClient();
    const dispatchService = new NotificationDispatchService(repo, deviceService, queue, provider);

    const router = createPushNotificationRouter(repo, deviceService, dispatchService);

    // Helper to simulate router request dispatch without TCP networking
    const invokeRouter = (method: string, url: string, headers: Record<string, string>, body: any): Promise<{ status: number; body: any }> => {
      return new Promise((resolve) => {
        let statusCode = 200;
        let responseBody: any = null;

        const req: any = {
          method,
          url,
          headers,
          body,
        };

        const res: any = {
          status(code: number) {
            statusCode = code;
            return this;
          },
          json(data: any) {
            responseBody = data;
            resolve({ status: statusCode, body: responseBody });
            return this;
          },
        };

        (router as any).handle(req, res, () => {
          resolve({ status: 404, body: { error: 'Not found' } });
        });
      });
    };

    // 1. Register device via HTTP (Coach context)
    const regRes = await invokeRouter('POST', '/devices/register', { 'x-user-id': 'pas_coach' }, {
      token: 'http_coach_device_token_xyz123',
      platform: 'IOS',
    });

    assert.strictEqual(regRes.status, 200);
    assert.strictEqual(regRes.body.success, true);
    assert.strictEqual(regRes.body.data.token, 'http_coach_device_token_xyz123');

    // 2. Unregister device via HTTP
    const unregRes = await invokeRouter('POST', '/devices/unregister', { 'x-user-id': 'pas_coach' }, {
      token: 'http_coach_device_token_xyz123',
    });

    assert.strictEqual(unregRes.status, 200);
    assert.strictEqual(unregRes.body.success, true);
    assert.strictEqual(unregRes.body.unregistered, true);
  });

  it('9. Express Route Handlers: Enforces sender RBAC clearances on notification routes', async () => {
    const { createPushNotificationRouter } = await import('../src/server/notifications/index');

    const repo = new InMemoryNotificationRepository();
    const deviceService = new DeviceTokenService(repo);
    const queue = new MemoryAsyncNotificationQueue();
    const provider = new FcmPushProviderClient();
    const dispatchService = new NotificationDispatchService(repo, deviceService, queue, provider);

    const router = createPushNotificationRouter(repo, deviceService, dispatchService);

    const invokeRouter = (method: string, url: string, headers: Record<string, string>, body: any): Promise<{ status: number; body: any }> => {
      return new Promise((resolve) => {
        let statusCode = 200;
        let responseBody: any = null;

        const req: any = {
          method,
          url,
          headers,
          body,
        };

        const res: any = {
          status(code: number) {
            statusCode = code;
            return this;
          },
          json(data: any) {
            responseBody = data;
            resolve({ status: statusCode, body: responseBody });
            return this;
          },
        };

        (router as any).handle(req, res, () => {
          resolve({ status: 404, body: { error: 'Not found' } });
        });
      });
    };

    // 1. Client attempts to send to role -> 403 Forbidden (missing 'notifications:send_role')
    const clientSendRes = await invokeRouter('POST', '/notifications/send-role', { 'x-user-id': 'k-01' }, {
      targetRole: 'coach',
      payload: { title: 'Test', body: 'Test Message' },
    });
    assert.strictEqual(clientSendRes.status, 403);
    assert.match(clientSendRes.body.detail, /Caller does not possess required permission/i);

    // 2. Coach sends to role 'client' -> 202 Accepted (Coach has 'notifications:send_role')
    const coachSendRes = await invokeRouter('POST', '/notifications/send-role', { 'x-user-id': 'pas_coach' }, {
      targetRole: 'client',
      payload: { title: 'Pengingat Sesi', body: 'Latihan besok pukul 08:00 WIB' },
    });
    assert.strictEqual(coachSendRes.status, 202);
    assert.strictEqual(coachSendRes.body.status, 'Accepted');

    // 3. Coach attempts system broadcast -> 403 Forbidden (Coach lacks 'notifications:broadcast')
    const coachBroadcastRes = await invokeRouter('POST', '/notifications/broadcast', { 'x-user-id': 'pas_coach' }, {
      payload: { title: 'Broadcast', body: 'Pengumuman Penting' },
    });
    assert.strictEqual(coachBroadcastRes.status, 403);

    // 4. Admin performs system broadcast -> 202 Accepted (Admin has 'notifications:broadcast')
    const adminBroadcastRes = await invokeRouter('POST', '/notifications/broadcast', { 'x-user-id': 'gym_admin' }, {
      payload: { title: 'Maintenance Gym', body: 'Area Functional Training tutup 2 jam' },
    });
    assert.strictEqual(adminBroadcastRes.status, 202);
    assert.strictEqual(adminBroadcastRes.body.status, 'Accepted');
  });
});
