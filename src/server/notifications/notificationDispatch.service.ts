import crypto from 'crypto';
import { IDeviceNotificationRepository } from './repository';
import { DeviceTokenService } from './deviceToken.service';
import { IAsyncNotificationQueue } from './queue';
import { IPushProviderClient, validatePayloadSize } from './pushProvider';
import { PushNotificationPayload, MulticastBatchResult, NotificationJobData } from './types';

export class NotificationDispatchService {
  constructor(
    private readonly repository: IDeviceNotificationRepository,
    private readonly deviceTokenService: DeviceTokenService,
    private readonly queue: IAsyncNotificationQueue,
    private readonly pushProvider: IPushProviderClient
  ) {
    this.registerWorkerHandler();
  }

  private registerWorkerHandler() {
    this.queue.process(async (job: NotificationJobData): Promise<MulticastBatchResult> => {
      const { tokens, payload } = job;
      const result = await this.pushProvider.sendMulticastBatch(tokens, payload);

      // Provider Feedback Loop: Deactivate any bad/dead tokens in the database
      if (result.invalidTokensPruned.length > 0) {
        await this.deviceTokenService.pruneInvalidTokens(result.invalidTokensPruned);
      }

      return result;
    });
  }

  /**
   * Audience Resolution: Target users dynamically by resolving active assigned roles in the DB,
   * mapping those users to their active device tokens.
   * Suspended/inactive users are strictly excluded at query time.
   */
  async resolveAudienceByRole(roleName: string): Promise<string[]> {
    if (!roleName || typeof roleName !== 'string') return [];
    return this.repository.findActiveTokensByRole(roleName.trim());
  }

  /**
   * Audience Resolution for targeted user IDs (enforcing ACTIVE account status).
   */
  async resolveAudienceByUserIds(userIds: string[]): Promise<string[]> {
    if (!userIds || userIds.length === 0) return [];
    return this.repository.findActiveTokensByUserIds(userIds);
  }

  /**
   * Audience Resolution for system-wide broadcast (all active users with active device tokens).
   */
  async resolveBroadcastAudience(): Promise<string[]> {
    return this.repository.getAllActiveTokens();
  }

  /**
   * Decoupled Dispatch: Validates payload size and enqueues job into background queue.
   * Unblocks HTTP request cycle immediately with 202 Accepted and a Job ID.
   */
  async enqueueDispatch(
    tokens: string[],
    payload: PushNotificationPayload
  ): Promise<{ jobId: string; recipientCount: number; enqueued: boolean }> {
    validatePayloadSize(payload);

    if (!tokens || tokens.length === 0) {
      return {
        jobId: 'none',
        recipientCount: 0,
        enqueued: false,
      };
    }

    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await this.queue.enqueue({
      jobId,
      tokens,
      payload,
    });

    return {
      jobId,
      recipientCount: tokens.length,
      enqueued: true,
    };
  }
}
