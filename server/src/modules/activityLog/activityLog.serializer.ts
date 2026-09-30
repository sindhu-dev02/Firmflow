export function serializeActivityLog(log: any) {
  return {
    id: log._id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId ?? null,
    metadata: log.metadata ?? {},
    actor: log.actorId
      ? { id: log.actorId._id, name: log.actorId.name, email: log.actorId.email }
      : null,
    createdAt: log.createdAt,
  };
}