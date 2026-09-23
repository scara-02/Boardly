const Card = require('../models/Card');
const List = require('../models/List');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');

/**
 * Get all cards for a list, ordered by position.
 */
async function getCardsByList(tenantId, listId) {
  const list = await List.forTenant(tenantId).findById(listId);
  if (!list) throw AppError.notFound('List not found');

  const cards = await Card.forTenant(tenantId)
    .find({ listId })
    .populate('assigneeId', 'name email')
    .sort({ position: 1 });
  return cards;
}

/**
 * Get a single card by ID.
 */
async function getCardById(tenantId, cardId) {
  const card = await Card.forTenant(tenantId)
    .findById(cardId)
    .populate('assigneeId', 'name email');
  if (!card) throw AppError.notFound('Card not found');
  return card;
}

/**
 * Create a new card in a list.
 */
async function createCard(tenantId, listId, data, userId) {
  const list = await List.forTenant(tenantId).findById(listId);
  if (!list) throw AppError.notFound('List not found');

  // Validate assignee belongs to the same tenant
  if (data.assigneeId) {
    const assignee = await User.forTenant(tenantId).findById(data.assigneeId);
    if (!assignee) throw AppError.badRequest('Assignee not found in this tenant');
  }

  // Auto-set position if not provided
  let position = data.position;
  if (position === undefined || position === null) {
    const lastCards = await Card.forTenant(tenantId)
      .find({ listId })
      .sort({ position: -1 })
      .limit(1);
    position = lastCards.length > 0 ? lastCards[0].position + 1 : 0;
  }

  const card = await Card.create({
    tenantId,
    listId,
    title: data.title,
    description: data.description || '',
    assigneeId: data.assigneeId || null,
    dueDate: data.dueDate || null,
    position,
  });

  await AuditLog.create({
    tenantId,
    actorId: userId,
    action: 'card.created',
    targetType: 'card',
    targetId: card._id,
    metadata: { title: data.title, listId },
  });

  return card;
}

/**
 * Update a card (including moving between lists).
 */
async function updateCard(tenantId, cardId, updates, userId) {
  const card = await Card.forTenant(tenantId).findById(cardId);
  if (!card) throw AppError.notFound('Card not found');

  const isMoving = updates.listId && updates.listId !== card.listId.toString();

  // If moving to a different list, verify the target list exists in tenant
  if (isMoving) {
    const targetList = await List.forTenant(tenantId).findById(updates.listId);
    if (!targetList) throw AppError.badRequest('Target list not found in this tenant');

    const oldListId = card.listId;
    card.listId = updates.listId;

    // If no position specified for the move, append to end
    if (updates.position === undefined) {
      const lastCards = await Card.forTenant(tenantId)
        .find({ listId: updates.listId })
        .sort({ position: -1 })
        .limit(1);
      card.position = lastCards.length > 0 ? lastCards[0].position + 1 : 0;
    }

    await AuditLog.create({
      tenantId,
      actorId: userId,
      action: 'card.moved',
      targetType: 'card',
      targetId: card._id,
      metadata: { fromListId: oldListId, toListId: updates.listId },
    });
  }

  // Validate assignee if being changed
  if (updates.assigneeId !== undefined) {
    if (updates.assigneeId !== null) {
      const assignee = await User.forTenant(tenantId).findById(updates.assigneeId);
      if (!assignee) throw AppError.badRequest('Assignee not found in this tenant');
    }
    card.assigneeId = updates.assigneeId;
  }

  if (updates.title !== undefined) card.title = updates.title;
  if (updates.description !== undefined) card.description = updates.description;
  if (updates.dueDate !== undefined) card.dueDate = updates.dueDate;
  if (updates.position !== undefined) card.position = updates.position;

  await card.save();

  if (!isMoving) {
    await AuditLog.create({
      tenantId,
      actorId: userId,
      action: 'card.updated',
      targetType: 'card',
      targetId: card._id,
      metadata: { updates: Object.keys(updates) },
    });
  }

  return card;
}

/**
 * Delete a card.
 */
async function deleteCard(tenantId, cardId, userId) {
  const card = await Card.forTenant(tenantId).findById(cardId);
  if (!card) throw AppError.notFound('Card not found');

  await Card.forTenant(tenantId).deleteOne({ _id: cardId });

  await AuditLog.create({
    tenantId,
    actorId: userId,
    action: 'card.deleted',
    targetType: 'card',
    targetId: cardId,
    metadata: { title: card.title, listId: card.listId },
  });
}

module.exports = { getCardsByList, getCardById, createCard, updateCard, deleteCard };
