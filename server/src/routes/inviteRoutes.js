const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/inviteController');
const requireAuth = require('../middleware/requireAuth');
const injectTenantContext = require('../middleware/injectTenantContext');
const { requireRole } = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createInviteSchema, acceptInviteSchema } = require('../validators/inviteSchemas');

// Create invite — requires auth + admin/owner
router.post(
  '/',
  requireAuth,
  injectTenantContext,
  requireRole(['admin', 'owner']),
  validate(createInviteSchema),
  inviteController.createInvite
);

// Accept invite — public (the token itself is the auth)
router.post(
  '/:token/accept',
  validate(acceptInviteSchema),
  inviteController.acceptInvite
);

module.exports = router;
