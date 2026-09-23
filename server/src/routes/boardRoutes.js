const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const { requireRole } = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createBoardSchema, updateBoardSchema } = require('../validators/resourceSchemas');

// All board routes are behind auth + tenant context (applied in index.js)
router.get('/', boardController.getBoards);
router.get('/:id', boardController.getBoardById);
router.post('/', requireRole(['member', 'admin', 'owner']), validate(createBoardSchema), boardController.createBoard);
router.patch('/:id', requireRole(['member', 'admin', 'owner']), validate(updateBoardSchema), boardController.updateBoard);
router.delete('/:id', requireRole(['admin', 'owner']), boardController.deleteBoard);

module.exports = router;
