const Tenant = require('../models/Tenant');
const AppError = require('../utils/AppError');

/**
 * Tenant context middleware.
 * Must run AFTER requireAuth.
 * Sets `req.tenantId` from the authenticated user's session (never from request body/params).
 * Loads the Tenant document and attaches it as `req.tenant`.
 */
async function injectTenantContext(req, res, next) {
  try {
    if (!req.user || !req.user.tenantId) {
      throw AppError.unauthorized('No tenant context available — authenticate first');
    }

    req.tenantId = req.user.tenantId;

    // Load tenant for plan limits, settings, etc.
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) {
      throw AppError.unauthorized('Tenant not found or has been deleted');
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = injectTenantContext;
