const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const AppError = require('../utils/AppError');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const config = require('../config');

/**
 * Sign up a new tenant (company) with the first owner user.
 * Uses a MongoDB transaction for atomicity.
 */
async function signup({ companyName, slug, name, email, password }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if slug already exists
    const existingTenant = await Tenant.findOne({ slug }).session(session);
    if (existingTenant) {
      throw AppError.conflict('A company with this slug already exists', 'SLUG_TAKEN');
    }

    // Create tenant
    const [tenant] = await Tenant.create([{ name: companyName, slug }], { session });

    // Create owner user
    const [user] = await User.create(
      [
        {
          tenantId: tenant._id,
          name,
          email,
          passwordHash: password, // will be hashed by pre-save hook
          role: 'owner',
        },
      ],
      { session }
    );

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id,
      tenantId: tenant._id,
      role: user.role,
    });

    const { refreshToken, tokenDoc } = await _createRefreshToken(
      user._id,
      tenant._id,
      session
    );

    await session.commitTransaction();

    return {
      accessToken,
      refreshToken,
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
        plan: tenant.plan,
      },
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Log in an existing user.
 */
async function login({ email, password, tenantSlug }) {
  // Find tenant by slug
  const tenant = await Tenant.findOne({ slug: tenantSlug });
  if (!tenant) {
    throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Find user within tenant
  const user = await User.findOne({ email }).setOptions({ tenantId: tenant._id });
  if (!user) {
    throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isValid = await user.comparePassword(password);
  if (!isValid) {
    throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user._id,
    tenantId: tenant._id,
    role: user.role,
  });

  const { refreshToken } = await _createRefreshToken(user._id, tenant._id);

  return {
    accessToken,
    refreshToken,
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
      plan: tenant.plan,
    },
  };
}

/**
 * Refresh access token using a valid refresh token.
 * Implements token rotation with reuse detection.
 */
async function refresh(rawRefreshToken) {
  // Verify JWT structure first
  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch (err) {
    throw AppError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  // Hash the raw token to look it up in DB
  const tokenHash = _hashToken(rawRefreshToken);

  const existingToken = await RefreshToken.findOne({ tokenHash }).setOptions({
    tenantId: decoded.tenantId,
  });

  if (!existingToken) {
    throw AppError.unauthorized('Refresh token not found', 'INVALID_REFRESH_TOKEN');
  }

  // Check if token has been revoked (reuse detection!)
  if (existingToken.revoked) {
    // Token reuse detected — this is a theft signal.
    // Revoke ALL tokens in this family to cut off the attacker.
    console.warn(
      `[SECURITY] Refresh token reuse detected for user ${existingToken.userId}, family ${existingToken.familyId}. Revoking entire family.`
    );
    await RefreshToken.updateMany(
      { familyId: existingToken.familyId },
      { revoked: true },
      { tenantId: decoded.tenantId }
    );
    throw AppError.unauthorized(
      'Refresh token reuse detected — all sessions invalidated. Please log in again.',
      'TOKEN_REUSE_DETECTED'
    );
  }

  // Check expiry
  if (existingToken.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
  }

  // Load user
  const user = await User.findById(decoded.userId).setOptions({
    tenantId: decoded.tenantId,
  });
  if (!user) {
    throw AppError.unauthorized('User not found', 'USER_NOT_FOUND');
  }

  // Rotate: revoke old token, create new one in the same family
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newAccessToken = generateAccessToken({
      userId: user._id,
      tenantId: user.tenantId,
      role: user.role,
    });

    const { refreshToken: newRefreshToken, tokenDoc: newTokenDoc } =
      await _createRefreshToken(user._id, user.tenantId, session, existingToken.familyId);

    // Revoke old token and link to new one
    existingToken.revoked = true;
    existingToken.replacedByTokenId = newTokenDoc._id;
    await existingToken.save({ session });

    await session.commitTransaction();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Logout — revoke the refresh token.
 */
async function logout(rawRefreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch (err) {
    // Even if token is expired, still try to revoke it
    return;
  }

  const tokenHash = _hashToken(rawRefreshToken);
  await RefreshToken.updateOne(
    { tokenHash },
    { revoked: true },
    { tenantId: decoded.tenantId }
  );
}

// ── Internal Helpers ─────────────────────────────────────────────

/**
 * Create a new refresh token record in the database.
 */
async function _createRefreshToken(userId, tenantId, session = null, familyId = null) {
  const refreshTokenJwt = generateRefreshToken({ userId, tenantId });
  const tokenHash = _hashToken(refreshTokenJwt);
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiryMs);

  const createOpts = session ? { session } : {};

  const [tokenDoc] = await RefreshToken.create(
    [
      {
        userId,
        tenantId,
        tokenHash,
        familyId: familyId || uuidv4(),
        expiresAt,
      },
    ],
    createOpts
  );

  return { refreshToken: refreshTokenJwt, tokenDoc };
}

/**
 * Hash a token using crypto (SHA-256) for storage.
 * We use SHA-256 instead of bcrypt here because refresh tokens are
 * already high-entropy JWTs — we just need a one-way mapping for lookup.
 */
function _hashToken(token) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { signup, login, refresh, logout };
