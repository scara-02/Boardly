const auditService = require('../services/auditService');
const { parsePagination } = require('../utils/pagination');

async function getAuditLogs(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const filters = {
      action: req.query.action,
      targetType: req.query.targetType,
      actorId: req.query.actorId,
    };
    const { logs, total } = await auditService.getAuditLogs(req.tenantId, pagination, filters);
    res.json({
      success: true,
      data: logs,
      pagination: pagination.getMeta(total),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAuditLogs };
