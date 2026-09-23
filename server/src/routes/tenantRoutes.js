const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { requireRole } = require('../middleware/requireRole');
const { z } = require('zod');
const validate = require('../middleware/validate');

const updateTenantSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  plan: z.enum(['free', 'pro']).optional(),
});

// All tenant routes require owner role
router.get('/', tenantController.getTenant);
router.patch('/', requireRole(['owner']), validate(updateTenantSchema), tenantController.updateTenant);
router.delete('/', requireRole(['owner']), tenantController.deleteTenant);

module.exports = router;
