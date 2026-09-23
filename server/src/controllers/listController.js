const listService = require('../services/listService');

async function getListsByBoard(req, res, next) {
  try {
    const lists = await listService.getListsByBoard(req.tenantId, req.params.boardId);
    res.json({ success: true, data: lists });
  } catch (err) {
    next(err);
  }
}

async function createList(req, res, next) {
  try {
    const list = await listService.createList(
      req.tenantId,
      req.params.boardId,
      req.body,
      req.user.userId
    );
    res.status(201).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

async function updateList(req, res, next) {
  try {
    const list = await listService.updateList(
      req.tenantId,
      req.params.id,
      req.body,
      req.user.userId
    );
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

async function reorderLists(req, res, next) {
  try {
    const lists = await listService.reorderLists(
      req.tenantId,
      req.params.boardId,
      req.body.listIds,
      req.user.userId
    );
    res.json({ success: true, data: lists });
  } catch (err) {
    next(err);
  }
}

async function deleteList(req, res, next) {
  try {
    await listService.deleteList(req.tenantId, req.params.id, req.user.userId);
    res.json({ success: true, message: 'List deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getListsByBoard, createList, updateList, reorderLists, deleteList };
