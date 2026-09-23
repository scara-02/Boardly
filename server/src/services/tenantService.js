const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const Invite = require('../models/Invite');
const RefreshToken = require('../models/RefreshToken');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');

/**
 * Get tenant details.
 */
async function getTenant(tenantId) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw AppError.notFound('Tenant not found');
  return tenant;
}

/**
 * Update tenant settings.
 */
async function updateTenant(tenantId, updates, actorId) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw AppError.notFound('Tenant not found');

  const allowedFields = ['name', 'plan'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      tenant[field] = updates[field];
    }
  }

  await tenant.save();

  // Audit log
  await AuditLog.create({
    tenantId,
    actorId,
    action: 'tenant.updated',
    targetType: 'tenant',
    targetId: tenantId,
    metadata: { updates },
  });

  return tenant;
}

/**
 * Delete tenant and cascade all related data.
 * Uses a MongoDB transaction for atomicity.
 */
async function deleteTenant(tenantId, actorId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const opts = { session, tenantId };

    // Delete all tenant-scoped data in parallel
    await Promise.all([
      Card.deleteMany({}, opts),
      List.deleteMany({}, opts),
      Board.deleteMany({}, opts),
      Invite.deleteMany({}, opts),
      RefreshToken.deleteMany({}, opts),
      AuditLog.deleteMany({}, opts),
      User.deleteMany({}, opts),
    ]);

    // Delete the tenant itself
    await Tenant.findByIdAndDelete(tenantId).session(session);

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = { getTenant, updateTenant, deleteTenant };
