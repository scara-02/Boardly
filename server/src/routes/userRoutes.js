const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireRole } = require('../middleware/requireRole');
const { z } = require('zod');
const validate = require('../middleware/validate');

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

router.get('/', requireRole(['admin', 'owner']), userController.getUsers);
router.get('/:id', requireRole(['admin', 'owner']), userController.getUserById);
router.patch('/:id/role', requireRole(['admin', 'owner']), validate(updateRoleSchema), userController.updateUserRole);
router.delete('/:id', requireRole(['admin', 'owner']), userController.removeUser);

module.exports = router;
