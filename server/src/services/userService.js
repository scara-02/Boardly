const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const { isRoleAbove } = require('../middleware/requireRole');

/**
 * List all users in a tenant with pagination.
 */
async function getUsers(tenantId, { skip, limit }) {
  const [users, total] = await Promise.all([
    User.forTenant(tenantId)
      .find({})
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.forTenant(tenantId).countDocuments(),
  ]);
  return { users, total };
}

/**
 * Get a single user by ID within a tenant.
 */
async function getUserById(tenantId, userId) {
  const user = await User.forTenant(tenantId).findById(userId).select('-passwordHash');
  if (!user) throw AppError.notFound('User not found');
  return user;
}

/**
 * Update a user's role within a tenant.
 * Enforces role hierarchy: you can only change roles of users
 * with strictly lower privilege than your own.
 */
async function updateUserRole(tenantId, targetUserId, newRole, actor) {
  const targetUser = await User.forTenant(tenantId).findById(targetUserId);
  if (!targetUser) throw AppError.notFound('User not found');

  // Cannot change your own role
  if (targetUser._id.toString() === actor.userId.toString()) {
    throw AppError.forbidden('You cannot change your own role');
  }

  // Actor must have strictly higher privilege than target's current role
  if (!isRoleAbove(actor.role, targetUser.role)) {
    throw AppError.forbidden('You cannot modify a user with equal or higher privileges');
  }

  // Cannot promote someone to your own level or above (except owner)
  if (actor.role !== 'owner' && !isRoleAbove(actor.role, newRole)) {
    throw AppError.forbidden('You cannot assign a role equal to or above your own');
  }

  // Cannot set role to 'owner' (there should be only one owner)
  if (newRole === 'owner') {
    throw AppError.forbidden('Cannot assign the owner role');
  }

  const previousRole = targetUser.role;
  targetUser.role = newRole;
  await targetUser.save();

  // Audit log
  await AuditLog.create({
    tenantId,
    actorId: actor.userId,
    action: 'user.role_changed',
    targetType: 'user',
    targetId: targetUserId,
    metadata: { previousRole, newRole },
  });

  return targetUser;
}

/**
 * Remove a user from a tenant.
 */
async function removeUser(tenantId, targetUserId, actor) {
  const targetUser = await User.forTenant(tenantId).findById(targetUserId);
  if (!targetUser) throw AppError.notFound('User not found');

  // Cannot remove yourself
  if (targetUser._id.toString() === actor.userId.toString()) {
    throw AppError.forbidden('You cannot remove yourself');
  }

  // Cannot remove a user with equal or higher privileges
  if (!isRoleAbove(actor.role, targetUser.role)) {
    throw AppError.forbidden('You cannot remove a user with equal or higher privileges');
  }

  // Cannot remove the owner
  if (targetUser.role === 'owner') {
    throw AppError.forbidden('Cannot remove the owner');
  }

  await User.forTenant(tenantId).deleteOne({ _id: targetUserId });

  // Audit log
  await AuditLog.create({
    tenantId,
    actorId: actor.userId,
    action: 'user.removed',
    targetType: 'user',
    targetId: targetUserId,
    metadata: { removedUser: targetUser.email },
  });
}

module.exports = { getUsers, getUserById, updateUserRole, removeUser };
