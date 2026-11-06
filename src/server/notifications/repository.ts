import crypto from 'crypto';
import {
  DevicePlatform,
  DeviceTokenEntity,
  UserEntity,
  RoleEntity,
  PermissionEntity,
  UserStatus
} from './types';

export interface IDeviceNotificationRepository {
  // Device Token Operations
  upsertDeviceToken(
    userId: string,
    token: string,
    platform: DevicePlatform
  ): Promise<DeviceTokenEntity>;
  deactivateDeviceToken(userId: string, token: string): Promise<boolean>;
  bulkDeactivateTokens(tokens: string[]): Promise<number>;
  getDeviceTokensForUser(userId: string): Promise<DeviceTokenEntity[]>;

  // RBAC & User Operations
  getUserWithPermissions(userId: string): Promise<{
    user: UserEntity;
    roles: string[];
    permissions: string[];
  } | null>;
  findActiveTokensByRole(roleName: string): Promise<string[]>;
  findActiveTokensByUserIds(userIds: string[]): Promise<string[]>;
  getAllActiveTokens(): Promise<string[]>;
}

/**
 * In-memory Relational Store ensuring strict relational integrity,
 * unique constraints, foreign keys, and indexes for offline gym floor & test environments.
 */
export class InMemoryNotificationRepository implements IDeviceNotificationRepository {
  public users = new Map<string, UserEntity>();
  public roles = new Map<string, RoleEntity>();
  public permissions = new Map<string, PermissionEntity>();
  public userRoles: Array<{ userId: string; roleId: string; assignedAt: string }> = [];
  public rolePermissions: Array<{ roleId: string; permissionId: string; assignedAt: string }> = [];
  public deviceTokens = new Map<string, DeviceTokenEntity>(); // Keyed by token for O(1) lookup

  constructor() {
    this.seedDefaultRbac();
  }

  private seedDefaultRbac() {
    const now = new Date().toISOString();

    // 1. Permissions
    const perms: Array<{ id: string; slug: string; desc: string }> = [
      { id: 'perm-broadcast', slug: 'notifications:broadcast', desc: 'Broadcast to all users' },
      { id: 'perm-send-role', slug: 'notifications:send_role', desc: 'Target notifications by role' },
      { id: 'perm-send-direct', slug: 'notifications:send_direct', desc: 'Send notification directly to user' },
    ];
    for (const p of perms) {
      this.permissions.set(p.id, { id: p.id, slug: p.slug, description: p.desc, created_at: now });
    }

    // 2. Roles
    const rolesList: Array<{ id: string; name: string; desc: string }> = [
      { id: 'role-admin', name: 'admin', desc: 'Gym Operations Manager / Super Admin' },
      { id: 'role-coach', name: 'coach', desc: 'Head Coach & Athletic Trainer' },
      { id: 'role-client', name: 'client', desc: 'Gym Member / Athlete' },
    ];
    for (const r of rolesList) {
      this.roles.set(r.id, { id: r.id, name: r.name, description: r.desc, created_at: now });
    }

    // 3. Role-Permission mappings
    // Admin gets all permissions
    this.rolePermissions.push(
      { roleId: 'role-admin', permissionId: 'perm-broadcast', assignedAt: now },
      { roleId: 'role-admin', permissionId: 'perm-send-role', assignedAt: now },
      { roleId: 'role-admin', permissionId: 'perm-send-direct', assignedAt: now }
    );

    // Coach gets send_role and send_direct
    this.rolePermissions.push(
      { roleId: 'role-coach', permissionId: 'perm-send-role', assignedAt: now },
      { roleId: 'role-coach', permissionId: 'perm-send-direct', assignedAt: now }
    );

    // 4. Default Seed Users
    const seedUsers: Array<{ id: string; email: string; roleId: string; status: UserStatus }> = [
      { id: 'pas_coach', email: 'panji.akbar@pelatihku.id', roleId: 'role-coach', status: 'ACTIVE' },
      { id: 'gym_admin', email: 'admin@pelatihku.id', roleId: 'role-admin', status: 'ACTIVE' },
      { id: 'k-01', email: 'budi.santoso@pelatihku.id', roleId: 'role-client', status: 'ACTIVE' },
      { id: 'k-02', email: 'siti.rahma@pelatihku.id', roleId: 'role-client', status: 'ACTIVE' },
      { id: 'k-suspended', email: 'suspended@pelatihku.id', roleId: 'role-client', status: 'SUSPENDED' },
    ];

    for (const u of seedUsers) {
      this.users.set(u.id, {
        id: u.id,
        email: u.email,
        status: u.status,
        created_at: now,
        updated_at: now,
      });
      this.userRoles.push({ userId: u.id, roleId: u.roleId, assignedAt: now });
    }
  }

  async upsertDeviceToken(
    userId: string,
    token: string,
    platform: DevicePlatform
  ): Promise<DeviceTokenEntity> {
    const now = new Date().toISOString();
    const existing = this.deviceTokens.get(token);

    if (existing) {
      existing.user_id = userId;
      existing.platform = platform;
      existing.is_active = true;
      existing.last_used_at = now;
      existing.updated_at = now;
      this.deviceTokens.set(token, existing);
      return { ...existing };
    }

    const newRecord: DeviceTokenEntity = {
      id: crypto.randomUUID(),
      user_id: userId,
      token,
      platform,
      is_active: true,
      last_used_at: now,
      created_at: now,
      updated_at: now,
    };
    this.deviceTokens.set(token, newRecord);
    return { ...newRecord };
  }

  async deactivateDeviceToken(userId: string, token: string): Promise<boolean> {
    const record = this.deviceTokens.get(token);
    if (!record) return false;

    // Security check: only the token owner can deactivate it
    if (record.user_id !== userId) {
      return false;
    }

    record.is_active = false;
    record.updated_at = new Date().toISOString();
    this.deviceTokens.set(token, record);
    return true;
  }

  async bulkDeactivateTokens(tokens: string[]): Promise<number> {
    let count = 0;
    const now = new Date().toISOString();
    for (const token of tokens) {
      const record = this.deviceTokens.get(token);
      if (record && record.is_active) {
        record.is_active = false;
        record.updated_at = now;
        this.deviceTokens.set(token, record);
        count++;
      }
    }
    return count;
  }

  async getDeviceTokensForUser(userId: string): Promise<DeviceTokenEntity[]> {
    const results: DeviceTokenEntity[] = [];
    for (const dt of this.deviceTokens.values()) {
      if (dt.user_id === userId) {
        results.push({ ...dt });
      }
    }
    return results;
  }

  async getUserWithPermissions(userId: string): Promise<{
    user: UserEntity;
    roles: string[];
    permissions: string[];
  } | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const userRoleLinks = this.userRoles.filter((ur) => ur.userId === userId);
    const roleIds = userRoleLinks.map((ur) => ur.roleId);

    const roles: string[] = [];
    const permissionSlugs = new Set<string>();

    for (const rId of roleIds) {
      const role = this.roles.get(rId);
      if (role) {
        roles.push(role.name);
      }
      const rolePermLinks = this.rolePermissions.filter((rp) => rp.roleId === rId);
      for (const rp of rolePermLinks) {
        const perm = this.permissions.get(rp.permissionId);
        if (perm) {
          permissionSlugs.add(perm.slug);
        }
      }
    }

    return {
      user: { ...user },
      roles,
      permissions: Array.from(permissionSlugs),
    };
  }

  async findActiveTokensByRole(roleName: string): Promise<string[]> {
    // 1. Find role ID
    let targetRoleId: string | undefined;
    for (const r of this.roles.values()) {
      if (r.name.toLowerCase() === roleName.toLowerCase()) {
        targetRoleId = r.id;
        break;
      }
    }
    if (!targetRoleId) return [];

    // 2. Find ACTIVE users with this role (strictly exclude SUSPENDED/INACTIVE)
    const matchingUserIds = new Set<string>();
    for (const ur of this.userRoles) {
      if (ur.roleId === targetRoleId) {
        const user = this.users.get(ur.userId);
        if (user && user.status === 'ACTIVE') {
          matchingUserIds.add(user.id);
        }
      }
    }

    // 3. Find active device tokens for these users
    const tokens: string[] = [];
    for (const dt of this.deviceTokens.values()) {
      if (dt.is_active && matchingUserIds.has(dt.user_id)) {
        tokens.push(dt.token);
      }
    }

    return Array.from(new Set(tokens));
  }

  async findActiveTokensByUserIds(userIds: string[]): Promise<string[]> {
    const activeTargetUsers = new Set<string>();
    for (const uid of userIds) {
      const user = this.users.get(uid);
      if (user && user.status === 'ACTIVE') {
        activeTargetUsers.add(user.id);
      }
    }

    const tokens: string[] = [];
    for (const dt of this.deviceTokens.values()) {
      if (dt.is_active && activeTargetUsers.has(dt.user_id)) {
        tokens.push(dt.token);
      }
    }

    return Array.from(new Set(tokens));
  }

  async getAllActiveTokens(): Promise<string[]> {
    const activeUsers = new Set<string>();
    for (const user of this.users.values()) {
      if (user.status === 'ACTIVE') {
        activeUsers.add(user.id);
      }
    }

    const tokens: string[] = [];
    for (const dt of this.deviceTokens.values()) {
      if (dt.is_active && activeUsers.has(dt.user_id)) {
        tokens.push(dt.token);
      }
    }

    return Array.from(new Set(tokens));
  }
}
