import { Request, Response } from 'express';
import { ActivityLog } from './activityLog.model';
import { catchAsync } from '../../shared/utils/catchAsync';
import { tenantFilter } from '../../shared/helpers/tenantFilter';
import { serializeActivityLog } from './activityLog.serializer';

export const listActivityLogs = catchAsync(async (req: Request, res: Response) => {
  const logs = await ActivityLog.find(tenantFilter(req))
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('actorId', 'name email');

  res.status(200).json({
    success: true,
    data: { logs: logs.map(serializeActivityLog) },
  });
});