import { Request, Response, NextFunction } from 'express';
import { IDeviceNotificationRepository } from './repository';
import { UserStatus } from './types';

export interface AuthenticatedUserPayload {
  id: string;
  email: string;
  status: UserStatus;
  roles: string[];
  permissions: Set<string>;
}

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUserPayload;
    }
  }
}

/**
 * Middleware that validates the caller session and populates req.authenticatedUser
 * with their active status, assigned roles, and granular permissions.
 */
export function createRbacAuthMiddleware(repository: IDeviceNotificationRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Extract identity: from Authorization bearer token, x-user-id header, or session
      const authHeader = req.headers.authorization;
      const explicitUserId = (req.headers['x-user-id'] as string) || '';

      let userId = explicitUserId;

      if (!userId && authHeader && authHeader.startsWith('Bearer ')) {
        const rawToken = authHeader.substring(7);
        if (rawToken.startsWith('pelatihku_jwt_')) {
          const payloadBase64 = rawToken.replace('pelatihku_jwt_', '');
          const parsed = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
          userId = parsed.uid || parsed.sub || '';
        } else if (rawToken.includes('.')) {
          // Standard JWT decode
          const parts = rawToken.split('.');
          if (parts.length === 3) {
            const parsed = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            userId = parsed.sub || parsed.uid || '';
          }
        }
      }

      if (!userId) {
        return res.status(401).json({
          type: 'https://api.pelatihku.pro/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Valid authentication credentials required.'
        });
      }

      // 2. Fetch user with active roles and permissions
      const profile = await repository.getUserWithPermissions(userId);

      if (!profile) {
        return res.status(401).json({
          type: 'https://api.pelatihku.pro/errors/user-not-found',
          title: 'User Not Found',
          status: 401,
          detail: 'No registered user matches the provided credentials.'
        });
      }

      // 3. Enforce active status: Suspended users are strictly blocked
      if (profile.user.status !== 'ACTIVE') {
        return res.status(403).json({
          type: 'https://api.pelatihku.pro/errors/account-suspended',
          title: 'Account Inactive',
          status: 403,
          detail: 'User account is suspended or inactive.'
        });
      }

      req.authenticatedUser = {
        id: profile.user.id,
        email: profile.user.email,
        status: profile.user.status,
        roles: profile.roles,
        permissions: new Set(profile.permissions)
      };

      return next();
    } catch (err: any) {
      return res.status(500).json({
        type: 'https://api.pelatihku.pro/errors/internal-auth-error',
        title: 'Authentication Error',
        status: 500,
        detail: err.message || 'Error resolving user authorization.'
      });
    }
  };
}

/**
 * Guard that verifies the sender has the required permission slug.
 */
export function requireNotificationPermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.authenticatedUser;
    if (!user) {
      return res.status(401).json({
        type: 'https://api.pelatihku.pro/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication context missing.'
      });
    }

    if (!user.permissions.has(requiredPermission)) {
      return res.status(403).json({
        type: 'https://api.pelatihku.pro/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: `Caller does not possess required permission: "${requiredPermission}".`,
        requiredPermission,
        assignedRoles: user.roles
      });
    }

    return next();
  };
}
