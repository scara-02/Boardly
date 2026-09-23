const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate a short-lived JWT access token.
 * @param {Object} payload - { userId, tenantId, role }
 * @returns {string} Signed JWT
 */
function generateAccessToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry }
  );
}

/**
 * Generate a long-lived JWT refresh token.
 * Contains only the userId — actual validation is done via DB lookup.
 * @param {Object} payload - { userId, tenantId }
 * @returns {string} Signed JWT
 */
function generateRefreshToken(payload) {
  const crypto = require('crypto');
  return jwt.sign(
    {
      userId: payload.userId,
      tenantId: payload.tenantId,
      type: 'refresh',
      jti: crypto.randomUUID(), // Ensure uniqueness even within the same second
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );
}

/**
 * Verify and decode an access token.
 * @param {string} token
 * @returns {Object} Decoded payload
 * @throws {jwt.JsonWebTokenError|jwt.TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * Verify and decode a refresh token.
 * @param {string} token
 * @returns {Object} Decoded payload
 * @throws {jwt.JsonWebTokenError|jwt.TokenExpiredError}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
