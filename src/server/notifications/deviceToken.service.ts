import { IDeviceNotificationRepository } from './repository';
import { DevicePlatform, DeviceTokenEntity, RegisterDeviceDto } from './types';

export class DeviceTokenService {
  constructor(private readonly repository: IDeviceNotificationRepository) {}

  /**
   * Idempotent token registration:
   * - Validates token format and platform.
   * - If token already exists under another user (device transferred or re-logged),
   *   reassigns ownership to the current user and sets is_active = true.
   * - If already owned, updates last_used_at and ensures is_active = true.
   * - Allows single user to register and own multiple active devices.
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto): Promise<DeviceTokenEntity> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Valid userId is required for device registration.');
    }

    if (!dto.token || typeof dto.token !== 'string' || dto.token.trim().length < 8) {
      throw new Error('Valid device registration token (minimum 8 characters) is required.');
    }

    const validPlatforms: DevicePlatform[] = ['IOS', 'ANDROID', 'WEB'];
    if (!dto.platform || !validPlatforms.includes(dto.platform)) {
      throw new Error(`Invalid platform. Allowed values: ${validPlatforms.join(', ')}.`);
    }

    return this.repository.upsertDeviceToken(userId.trim(), dto.token.trim(), dto.platform);
  }

  /**
   * Idempotent token unregistration:
   * - Sets is_active = false for the specified token.
   * - Scoped strictly to the calling user to prevent unauthorized revocation.
   */
  async unregisterDevice(userId: string, token: string): Promise<boolean> {
    if (!userId || !token) {
      return false;
    }
    return this.repository.deactivateDeviceToken(userId.trim(), token.trim());
  }

  /**
   * Fetch all registered tokens for a user.
   */
  async getUserTokens(userId: string): Promise<DeviceTokenEntity[]> {
    return this.repository.getDeviceTokensForUser(userId);
  }

  /**
   * Invalidate provider-rejected tokens (e.g., FCM Unregistered / BadDeviceToken).
   */
  async pruneInvalidTokens(tokens: string[]): Promise<number> {
    if (!tokens || tokens.length === 0) return 0;
    return this.repository.bulkDeactivateTokens(tokens);
  }
}
