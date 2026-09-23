const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { requireRole } = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createCardSchema, updateCardSchema } = require('../validators/resourceSchemas');

// Nested under lists: /api/lists/:listId/cards
router.get('/lists/:listId/cards', cardController.getCardsByList);
router.post(
  '/lists/:listId/cards',
  requireRole(['member', 'admin', 'owner']),
  validate(createCardSchema),
  cardController.createCard
);

// Direct card routes: /api/cards/:id
router.get('/cards/:id', cardController.getCardById);
router.patch(
  '/cards/:id',
  requireRole(['member', 'admin', 'owner']),
  validate(updateCardSchema),
  cardController.updateCard
);
router.delete(
  '/cards/:id',
  requireRole(['admin', 'owner']),
  cardController.deleteCard
);

module.exports = router;
