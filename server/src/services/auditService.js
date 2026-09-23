const AuditLog = require('../models/AuditLog');

/**
 * Get audit logs for a tenant with pagination and optional filters.
 */
async function getAuditLogs(tenantId, { skip, limit }, filters = {}) {
  const query = {};

  if (filters.action) query.action = filters.action;
  if (filters.targetType) query.targetType = filters.targetType;
  if (filters.actorId) query.actorId = filters.actorId;

  const [logs, total] = await Promise.all([
    AuditLog.forTenant(tenantId)
      .find(query)
      .populate('actorId', 'name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.forTenant(tenantId).countDocuments(query),
  ]);

  return { logs, total };
}

module.exports = { getAuditLogs };
