import { Router, Request, Response } from 'express';
import { DeviceTokenService } from './deviceToken.service';
import { NotificationDispatchService } from './notificationDispatch.service';
import { createRbacAuthMiddleware, requireNotificationPermission } from './rbac.guard';
import { IDeviceNotificationRepository } from './repository';

export function createPushNotificationRouter(
  repository: IDeviceNotificationRepository,
  deviceService: DeviceTokenService,
  dispatchService: NotificationDispatchService
): Router {
  const router = Router();
  const authMiddleware = createRbacAuthMiddleware(repository);

  // Apply authentication to all endpoints in this router
  router.use(authMiddleware);

  // 1. POST /devices/register
  router.post('/devices/register', async (req: Request, res: Response) => {
    try {
      const user = req.authenticatedUser!;
      const { token, platform } = req.body;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          type: 'https://api.pelatihku.pro/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Field "token" is required and must be a string.',
        });
      }

      if (!platform || !['IOS', 'ANDROID', 'WEB'].includes(platform)) {
        return res.status(400).json({
          type: 'https://api.pelatihku.pro/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Field "platform" must be one of: IOS, ANDROID, WEB.',
        });
      }

      const registered = await deviceService.registerDevice(user.id, {
        token: token.trim(),
        platform,
      });

      return res.status(200).json({
        success: true,
        data: registered,
      });
    } catch (err: any) {
      return res.status(400).json({
        type: 'https://api.pelatihku.pro/errors/registration-failed',
        title: 'Device Registration Failed',
        status: 400,
        detail: err.message,
      });
    }
  });

  // 2. POST /devices/unregister
  router.post('/devices/unregister', async (req: Request, res: Response) => {
    try {
      const user = req.authenticatedUser!;
      const { token } = req.body;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          type: 'https://api.pelatihku.pro/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Field "token" is required.',
        });
      }

      const unregistered = await deviceService.unregisterDevice(user.id, token.trim());

      return res.status(200).json({
        success: true,
        unregistered,
      });
    } catch (err: any) {
      return res.status(400).json({
        type: 'https://api.pelatihku.pro/errors/unregistration-failed',
        title: 'Device Unregistration Failed',
        status: 400,
        detail: err.message,
      });
    }
  });

  // 3. POST /notifications/send-role
  // Guarded by permission 'notifications:send_role'
  router.post(
    '/notifications/send-role',
    requireNotificationPermission('notifications:send_role'),
    async (req: Request, res: Response) => {
      try {
        const { targetRole, payload } = req.body;

        if (!targetRole || typeof targetRole !== 'string') {
          return res.status(400).json({
            type: 'https://api.pelatihku.pro/errors/validation-error',
            title: 'Validation Error',
            status: 400,
            detail: 'Field "targetRole" is required.',
          });
        }

        if (!payload || !payload.title || !payload.body) {
          return res.status(400).json({
            type: 'https://api.pelatihku.pro/errors/validation-error',
            title: 'Validation Error',
            status: 400,
            detail: 'Notification payload must include non-empty "title" and "body".',
          });
        }

        // Audience Resolution: Query active tokens of active users with this role
        const audienceTokens = await dispatchService.resolveAudienceByRole(targetRole);

        // Decoupled Background Enqueue
        const enqueueResult = await dispatchService.enqueueDispatch(audienceTokens, payload);

        return res.status(202).json({
          status: 'Accepted',
          message: `Notification dispatch enqueued for role "${targetRole}".`,
          details: enqueueResult,
        });
      } catch (err: any) {
        return res.status(400).json({
          type: 'https://api.pelatihku.pro/errors/dispatch-error',
          title: 'Dispatch Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 4. POST /notifications/broadcast
  // Guarded by permission 'notifications:broadcast'
  router.post(
    '/notifications/broadcast',
    requireNotificationPermission('notifications:broadcast'),
    async (req: Request, res: Response) => {
      try {
        const { payload } = req.body;

        if (!payload || !payload.title || !payload.body) {
          return res.status(400).json({
            type: 'https://api.pelatihku.pro/errors/validation-error',
            title: 'Validation Error',
            status: 400,
            detail: 'Notification payload must include non-empty "title" and "body".',
          });
        }

        const audienceTokens = await dispatchService.resolveBroadcastAudience();
        const enqueueResult = await dispatchService.enqueueDispatch(audienceTokens, payload);

        return res.status(202).json({
          status: 'Accepted',
          message: 'System-wide broadcast notification enqueued.',
          details: enqueueResult,
        });
      } catch (err: any) {
        return res.status(400).json({
          type: 'https://api.pelatihku.pro/errors/dispatch-error',
          title: 'Broadcast Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  return router;
}
