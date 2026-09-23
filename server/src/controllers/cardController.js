const cardService = require('../services/cardService');

async function getCardsByList(req, res, next) {
  try {
    const cards = await cardService.getCardsByList(req.tenantId, req.params.listId);
    res.json({ success: true, data: cards });
  } catch (err) {
    next(err);
  }
}

async function getCardById(req, res, next) {
  try {
    const card = await cardService.getCardById(req.tenantId, req.params.id);
    res.json({ success: true, data: card });
  } catch (err) {
    next(err);
  }
}

async function createCard(req, res, next) {
  try {
    const card = await cardService.createCard(
      req.tenantId,
      req.params.listId,
      req.body,
      req.user.userId
    );
    res.status(201).json({ success: true, data: card });
  } catch (err) {
    next(err);
  }
}

async function updateCard(req, res, next) {
  try {
    const card = await cardService.updateCard(
      req.tenantId,
      req.params.id,
      req.body,
      req.user.userId
    );
    res.json({ success: true, data: card });
  } catch (err) {
    next(err);
  }
}

async function deleteCard(req, res, next) {
  try {
    await cardService.deleteCard(req.tenantId, req.params.id, req.user.userId);
    res.json({ success: true, message: 'Card deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCardsByList, getCardById, createCard, updateCard, deleteCard };
