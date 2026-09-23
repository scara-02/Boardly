const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
const { requireRole } = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createListSchema, updateListSchema, reorderListSchema } = require('../validators/resourceSchemas');

// Nested under boards: /api/boards/:boardId/lists
router.get('/boards/:boardId/lists', listController.getListsByBoard);
router.post(
  '/boards/:boardId/lists',
  requireRole(['member', 'admin', 'owner']),
  validate(createListSchema),
  listController.createList
);
router.put(
  '/boards/:boardId/lists/reorder',
  requireRole(['member', 'admin', 'owner']),
  validate(reorderListSchema),
  listController.reorderLists
);

// Direct list routes: /api/lists/:id
router.patch(
  '/lists/:id',
  requireRole(['member', 'admin', 'owner']),
  validate(updateListSchema),
  listController.updateList
);
router.delete(
  '/lists/:id',
  requireRole(['admin', 'owner']),
  listController.deleteList
);

module.exports = router;
