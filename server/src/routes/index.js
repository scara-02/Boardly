const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const injectTenantContext = require('../middleware/injectTenantContext');
const rateLimiter = require('../middleware/rateLimiter');

// Import route modules
const authRoutes = require('./authRoutes');
const inviteRoutes = require('./inviteRoutes');
const tenantRoutes = require('./tenantRoutes');
const userRoutes = require('./userRoutes');
const boardRoutes = require('./boardRoutes');
const listRoutes = require('./listRoutes');
const cardRoutes = require('./cardRoutes');
const auditLogRoutes = require('./auditLogRoutes');

// ── Public routes (no auth required) ────────────────────────────
router.use('/auth', authRoutes);

// Invite routes have mixed auth (create=auth, accept=public)
// Auth is handled within the inviteRoutes file itself
router.use('/invites', inviteRoutes);

// ── Protected routes (auth + tenant context + rate limiting) ────
router.use(requireAuth);
router.use(injectTenantContext);
router.use(rateLimiter);

router.use('/tenant', tenantRoutes);
router.use('/users', userRoutes);
router.use('/boards', boardRoutes);
router.use('/', listRoutes);   // handles /boards/:boardId/lists and /lists/:id
router.use('/', cardRoutes);   // handles /lists/:listId/cards and /cards/:id
router.use('/audit-log', auditLogRoutes);

module.exports = router;
