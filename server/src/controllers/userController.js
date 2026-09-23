const userService = require('../services/userService');
const { parsePagination } = require('../utils/pagination');

async function getUsers(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const { users, total } = await userService.getUsers(req.tenantId, pagination);
    res.json({
      success: true,
      data: users,
      pagination: pagination.getMeta(total),
    });
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserById(req.tenantId, req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const user = await userService.updateUserRole(
      req.tenantId,
      req.params.id,
      req.body.role,
      req.user
    );
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function removeUser(req, res, next) {
  try {
    await userService.removeUser(req.tenantId, req.params.id, req.user);
    res.json({ success: true, message: 'User removed successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUsers, getUserById, updateUserRole, removeUser };
