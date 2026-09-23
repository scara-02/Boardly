const AppError = require('../utils/AppError');

/**
 * Role hierarchy — higher index = more privilege.
 */
const ROLE_HIERARCHY = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

/**
 * Role-based access control middleware factory.
 *
 * @param {string[]} allowedRoles - Roles permitted to access the route
 *   (e.g., ['admin', 'owner'])
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.delete('/boards/:id', requireRole(['admin', 'owner']), controller.delete);
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return next(
        AppError.forbidden(
          `Role '${userRole}' is not authorized for this action. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

/**
 * Check if roleA has equal or higher privilege than roleB.
 * @param {string} roleA
 * @param {string} roleB
 * @returns {boolean}
 */
function isRoleAtLeast(roleA, roleB) {
  return (ROLE_HIERARCHY[roleA] ?? -1) >= (ROLE_HIERARCHY[roleB] ?? -1);
}

/**
 * Check if roleA has strictly higher privilege than roleB.
 * @param {string} roleA
 * @param {string} roleB
 * @returns {boolean}
 */
function isRoleAbove(roleA, roleB) {
  return (ROLE_HIERARCHY[roleA] ?? -1) > (ROLE_HIERARCHY[roleB] ?? -1);
}

module.exports = { requireRole, isRoleAtLeast, isRoleAbove, ROLE_HIERARCHY };
