const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Invite = require('../models/Invite');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');

/**
 * Create an invite for a new user to join the tenant.
 */
async function createInvite(tenantId, email, role, actorId) {
  // Check if user already exists in this tenant
  const existingUser = await User.forTenant(tenantId).findOne({ email });
  if (existingUser) {
    throw AppError.conflict('A user with this email already exists in this tenant');
  }

  // Check tenant user limit
  const tenant = await Tenant.findById(tenantId);
  const userCount = await User.forTenant(tenantId).countDocuments();
  if (userCount >= tenant.settings.maxUsers) {
    throw AppError.forbidden(
      `Tenant user limit reached (${tenant.settings.maxUsers}). Upgrade your plan.`,
      'USER_LIMIT_REACHED'
    );
  }

  // Check if there's already a pending invite for this email
  const existingInvite = await Invite.forTenant(tenantId).findOne({
    email,
    used: false,
    expiresAt: { $gt: new Date() },
  });
  if (existingInvite) {
    throw AppError.conflict('An active invite already exists for this email');
  }

  // Generate a unique invite token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await Invite.create({
    tenantId,
    email,
    role,
    tokenHash,
    expiresAt,
  });

  // Audit log
  await AuditLog.create({
    tenantId,
    actorId,
    action: 'user.invited',
    targetType: 'invite',
    targetId: invite._id,
    metadata: { email, role },
  });

  // Return the raw token (in production this would be emailed)
  console.log(`[Invite] Token for ${email}: ${rawToken}`);

  return {
    invite: {
      id: invite._id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    },
    token: rawToken, // returned in response for dev convenience
  };
}

/**
 * Accept an invite token — creates the user and joins the tenant.
 * Uses a MongoDB transaction.
 */
async function acceptInvite(rawToken, name, password) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Find the invite (not tenant-scoped since the user isn't authenticated yet)
  const invite = await Invite.findOne({ tokenHash });
  if (!invite) {
    throw AppError.notFound('Invalid or expired invite token');
  }

  if (invite.used) {
    throw AppError.badRequest('This invite has already been used', 'INVITE_USED');
  }

  if (invite.expiresAt < new Date()) {
    throw AppError.badRequest('This invite has expired', 'INVITE_EXPIRED');
  }

  // Check if email is already registered in this tenant
  const existingUser = await User.forTenant(invite.tenantId).findOne({ email: invite.email });
  if (existingUser) {
    throw AppError.conflict('A user with this email already exists in this tenant');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create user
    const [user] = await User.create(
      [
        {
          tenantId: invite.tenantId,
          name,
          email: invite.email,
          passwordHash: password, // hashed by pre-save hook
          role: invite.role,
        },
      ],
      { session }
    );

    // Mark invite as used
    invite.used = true;
    await invite.save({ session });

    // Audit log
    await AuditLog.create(
      [
        {
          tenantId: invite.tenantId,
          actorId: user._id,
          action: 'user.joined',
          targetType: 'user',
          targetId: user._id,
          metadata: { email: invite.email, role: invite.role, inviteId: invite._id },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Load tenant for response
    const tenant = await Tenant.findById(invite.tenantId);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = { createInvite, acceptInvite };
