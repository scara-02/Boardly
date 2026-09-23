const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { requireRole } = require('../middleware/requireRole');

router.get('/', requireRole(['admin', 'owner']), auditLogController.getAuditLogs);

module.exports = router;
