import { Schema, model, Types } from 'mongoose';

export interface ActivityLogDoc {
  organizationId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;       // e.g. 'user.invited', 'user.deactivated', 'product.deleted'
  targetType: string;   // 'user' | 'product'
  targetId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<ActivityLogDoc>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Every read for this feature is "latest logs for my org" — this index makes that fast.
activityLogSchema.index({ organizationId: 1, createdAt: -1 });

export const ActivityLog = model<ActivityLogDoc>('ActivityLog', activityLogSchema);