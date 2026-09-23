const Board = require('../models/Board');
const Tenant = require('../models/Tenant');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');

/**
 * List boards for a tenant with pagination.
 */
async function getBoards(tenantId, { skip, limit }) {
  const [boards, total] = await Promise.all([
    Board.forTenant(tenantId)
      .find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Board.forTenant(tenantId).countDocuments(),
  ]);
  return { boards, total };
}

/**
 * Get a single board by ID.
 */
async function getBoardById(tenantId, boardId) {
  const board = await Board.forTenant(tenantId)
    .findById(boardId)
    .populate('createdBy', 'name email');
  if (!board) throw AppError.notFound('Board not found');
  return board;
}

/**
 * Create a new board.
 */
async function createBoard(tenantId, { name }, userId) {
  // Check board limit
  const tenant = await Tenant.findById(tenantId);
  const boardCount = await Board.forTenant(tenantId).countDocuments();
  if (boardCount >= tenant.settings.maxBoards) {
    throw AppError.forbidden(
      `Board limit reached (${tenant.settings.maxBoards}). Upgrade your plan.`,
      'BOARD_LIMIT_REACHED'
    );
  }

  const board = await Board.create({
    tenantId,
    name,
    createdBy: userId,
  });

  // Audit log
  await AuditLog.create({
    tenantId,
    actorId: userId,
    action: 'board.created',
    targetType: 'board',
    targetId: board._id,
    metadata: { name },
  });

  return board;
}

/**
 * Update a board.
 */
async function updateBoard(tenantId, boardId, updates, userId) {
  const board = await Board.forTenant(tenantId).findById(boardId);
  if (!board) throw AppError.notFound('Board not found');

  if (updates.name !== undefined) board.name = updates.name;
  await board.save();

  await AuditLog.create({
    tenantId,
    actorId: userId,
    action: 'board.updated',
    targetType: 'board',
    targetId: board._id,
    metadata: { updates },
  });

  return board;
}

/**
 * Delete a board and all its lists and cards.
 */
async function deleteBoard(tenantId, boardId, userId) {
  const board = await Board.forTenant(tenantId).findById(boardId);
  if (!board) throw AppError.notFound('Board not found');

  // Cascade: delete cards in all lists of this board, then lists, then board
  const List = require('../models/List');
  const Card = require('../models/Card');

  const lists = await List.forTenant(tenantId).find({ boardId });
  const listIds = lists.map((l) => l._id);

  if (listIds.length > 0) {
    await Card.forTenant(tenantId).deleteMany({ listId: { $in: listIds } });
  }
  await List.forTenant(tenantId).deleteMany({ boardId });
  await Board.forTenant(tenantId).deleteOne({ _id: boardId });

  await AuditLog.create({
    tenantId,
    actorId: userId,
    action: 'board.deleted',
    targetType: 'board',
    targetId: boardId,
    metadata: { name: board.name },
  });
}

module.exports = { getBoards, getBoardById, createBoard, updateBoard, deleteBoard };
