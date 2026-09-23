const inviteService = require('../services/inviteService');

async function createInvite(req, res, next) {
  try {
    const result = await inviteService.createInvite(
      req.tenantId,
      req.body.email,
      req.body.role,
      req.user.userId
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function acceptInvite(req, res, next) {
  try {
    const result = await inviteService.acceptInvite(
      req.params.token,
      req.body.name,
      req.body.password
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { createInvite, acceptInvite };
