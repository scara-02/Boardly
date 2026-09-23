const List = require('../models/List');
const Board = require('../models/Board');
const Card = require('../models/Card');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');

/**
 * Get all lists for a board, ordered by position.
 */
async function getListsByBoard(tenantId, boardId) {
  // Verify board exists in this tenant
  const board = await Board.forTenant(tenantId).findById(boardId);
  if (!board) throw AppError.notFound('Board not found');

  const lists = await List.forTenant(tenantId)
    .find({ boardId })
    .sort({ position: 1 });
  return lists;
}

/**
 * Create a new list in a board.
 */
async function createList(tenantId, boardId, { name, position }, userId) {
  const board = await Board.forTenant(tenantId).findById(boardId);
  if (!board) throw AppError.notFound('Board not found');

  // Auto-set position if not provided
  if (position === undefined || position === null) {
    const lastList = await List.forTenant(tenantId)
      .find({ boardId })
      .sort({ position: -1 })
      .limit(1);
    const lastPosition = lastList.length > 0 ? lastList[0].position : -1;
    position = lastPosition + 1;
  }

  const list = await List.create({
    tenantId,
    boardId,
    name,
    position,
  });

  await AuditLog.create({
    tenantId,
    actorId: userId,
    action: 'list.created',
    targetType: 'list',
    targetId: list._id,
    metadata: { name, boardId },
  });

  return list;
}

/**
 * Update a list.
 */
async function updateList(tenantId, listId, updates, userId) {
  const list = await List.forTenant(tenantId).findById(listId);
  if (!list) throw AppError.notFound('List not found');

  if (updates.name !== undefined) list.name = updates.name;
  if (updates.position !== undefined) list.position = updates.position;
  await list.save();

  await AuditLog.create({
    tenantId,
    actorId: userId,
    action: 'list.updated',
    targetType: 'list',
    targetId: list._id,
    metadata: { updates },
  });

  return list;
}

/**
 * Reorder lists within a board.
 * @param {string[]} listIds - Ordered array of list IDs
 */
async function reorderLists(tenantId, boardId, listIds, userId) {
  const board = await Board.forTenant(tenantId).findById(boardId);
  if (!board) throw AppError.notFound('Board not found');

  const bulkOps = listIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, tenantId, boardId },
      update: { $set: { position: index } },
    },
  }));

  await List.bulkWrite(bulkOps);
  return getListsByBoard(tenantId, boardId);
}

/**
 * Delete a list and all its cards.
 */
async function deleteList(tenantId, listId, userId) {
  const list = await List.forTenant(tenantId).findById(listId);
  if (!list) throw AppError.notFound('List not found');

  // Delete all cards in the list
  await Card.forTenant(tenantId).deleteMany({ listId });
  await List.forTenant(tenantId).deleteOne({ _id: listId });

  await AuditLog.create({
    tenantId,
    actorId: userId,
    action: 'list.deleted',
    targetType: 'list',
    targetId: listId,
    metadata: { name: list.name, boardId: list.boardId },
  });
}

module.exports = { getListsByBoard, createList, updateList, reorderLists, deleteList };
