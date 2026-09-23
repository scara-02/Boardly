const tenantService = require('../services/tenantService');

async function getTenant(req, res, next) {
  try {
    const tenant = await tenantService.getTenant(req.tenantId);
    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
}

async function updateTenant(req, res, next) {
  try {
    const tenant = await tenantService.updateTenant(req.tenantId, req.body, req.user.userId);
    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
}

async function deleteTenant(req, res, next) {
  try {
    await tenantService.deleteTenant(req.tenantId, req.user.userId);
    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTenant, updateTenant, deleteTenant };
