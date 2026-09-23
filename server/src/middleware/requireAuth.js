const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Authentication middleware.
 * Extracts and verifies the JWT access token from the Authorization header.
 * Attaches `req.user` with { userId, tenantId, role, name, email }.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw AppError.unauthorized('No token provided');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Access token expired', 'TOKEN_EXPIRED');
      }
      throw AppError.unauthorized('Invalid access token', 'INVALID_TOKEN');
    }

    // Load user from DB to ensure they still exist and get current role
    const user = await User.findById(decoded.userId).setOptions({ tenantId: decoded.tenantId });
    if (!user) {
      throw AppError.unauthorized('User no longer exists', 'USER_NOT_FOUND');
    }

    // Attach user context to request
    req.user = {
      userId: user._id,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
