export type DevicePlatform = 'IOS' | 'ANDROID' | 'WEB';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export interface DeviceTokenEntity {
  id: string;
  user_id: string;
  token: string;
  platform: DevicePlatform;
  is_active: boolean;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserEntity {
  id: string;
  email: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface RoleEntity {
  id: string;
  name: string; // 'admin' | 'coach' | 'client' | etc.
  description?: string;
  created_at: string;
}

export interface PermissionEntity {
  id: string;
  slug: string; // 'notifications:broadcast' | 'notifications:send_role' | 'notifications:send_direct'
  description?: string;
  created_at: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
}

export interface RegisterDeviceDto {
  token: string;
  platform: DevicePlatform;
}

export interface UnregisterDeviceDto {
  token: string;
}

export interface SendToRoleDto {
  targetRole: string;
  payload: PushNotificationPayload;
}

export interface BroadcastNotificationDto {
  payload: PushNotificationPayload;
}

export interface SendDirectNotificationDto {
  targetUserIds: string[];
  payload: PushNotificationPayload;
}

export interface MulticastBatchResult {
  totalSent: number;
  successCount: number;
  failureCount: number;
  invalidTokensPruned: string[];
}

export interface NotificationJobData {
  jobId: string;
  tokens: string[];
  payload: PushNotificationPayload;
  attempt?: number;
}
