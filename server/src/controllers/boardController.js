const boardService = require('../services/boardService');
const { parsePagination } = require('../utils/pagination');

async function getBoards(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const { boards, total } = await boardService.getBoards(req.tenantId, pagination);
    res.json({
      success: true,
      data: boards,
      pagination: pagination.getMeta(total),
    });
  } catch (err) {
    next(err);
  }
}

async function getBoardById(req, res, next) {
  try {
    const board = await boardService.getBoardById(req.tenantId, req.params.id);
    res.json({ success: true, data: board });
  } catch (err) {
    next(err);
  }
}

async function createBoard(req, res, next) {
  try {
    const board = await boardService.createBoard(req.tenantId, req.body, req.user.userId);
    res.status(201).json({ success: true, data: board });
  } catch (err) {
    next(err);
  }
}

async function updateBoard(req, res, next) {
  try {
    const board = await boardService.updateBoard(
      req.tenantId,
      req.params.id,
      req.body,
      req.user.userId
    );
    res.json({ success: true, data: board });
  } catch (err) {
    next(err);
  }
}

async function deleteBoard(req, res, next) {
  try {
    await boardService.deleteBoard(req.tenantId, req.params.id, req.user.userId);
    res.json({ success: true, message: 'Board deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBoards, getBoardById, createBoard, updateBoard, deleteBoard };
