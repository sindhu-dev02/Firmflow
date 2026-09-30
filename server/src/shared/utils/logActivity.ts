import { Request } from 'express';
import { ActivityLog } from '../../modules/activityLog/activityLog.model';

interface LogActivityParams {
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes one activity log entry. Deliberately swallows its own errors —
 * a logging failure should never break the real operation it's attached to
 * (e.g. a product still gets deleted even if the log write fails).
 */
export async function logActivity(req: Request, params: LogActivityParams) {
  if (!req.user?.organizationId) return;

  try {
    await ActivityLog.create({
      organizationId: req.user.organizationId,
      actorId: req.user.userId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata,
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}