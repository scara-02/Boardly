const { requireRole, isRoleAtLeast, isRoleAbove, ROLE_HIERARCHY } = require('../../src/middleware/requireRole');

describe('RBAC — Role-Based Access Control', () => {
  describe('requireRole middleware', () => {
    const mockRes = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    it('should allow access when user role is in the allowed roles', () => {
      const middleware = requireRole(['admin', 'owner']);
      const req = { user: { role: 'admin' } };
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(); // called without error
    });

    it('should deny access when user role is NOT in the allowed roles', () => {
      const middleware = requireRole(['admin', 'owner']);
      const req = { user: { role: 'member' } };
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(403);
    });

    it('should deny access when user role is viewer and route requires member+', () => {
      const middleware = requireRole(['member', 'admin', 'owner']);
      const req = { user: { role: 'viewer' } };
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });

    it('should return 401 when user is not authenticated', () => {
      const middleware = requireRole(['member']);
      const req = {}; // no user
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should allow owner access to owner-only routes', () => {
      const middleware = requireRole(['owner']);
      const req = { user: { role: 'owner' } };
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should deny admin access to owner-only routes', () => {
      const middleware = requireRole(['owner']);
      const req = { user: { role: 'admin' } };
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });
  });

  describe('Role hierarchy helpers', () => {
    it('isRoleAtLeast should correctly compare roles', () => {
      expect(isRoleAtLeast('owner', 'admin')).toBe(true);
      expect(isRoleAtLeast('owner', 'owner')).toBe(true);
      expect(isRoleAtLeast('admin', 'owner')).toBe(false);
      expect(isRoleAtLeast('member', 'viewer')).toBe(true);
      expect(isRoleAtLeast('viewer', 'member')).toBe(false);
    });

    it('isRoleAbove should correctly compare roles (strictly above)', () => {
      expect(isRoleAbove('owner', 'admin')).toBe(true);
      expect(isRoleAbove('owner', 'owner')).toBe(false);
      expect(isRoleAbove('admin', 'member')).toBe(true);
      expect(isRoleAbove('admin', 'admin')).toBe(false);
      expect(isRoleAbove('member', 'viewer')).toBe(true);
      expect(isRoleAbove('viewer', 'viewer')).toBe(false);
    });

    it('ROLE_HIERARCHY should have correct ordering', () => {
      expect(ROLE_HIERARCHY.viewer).toBeLessThan(ROLE_HIERARCHY.member);
      expect(ROLE_HIERARCHY.member).toBeLessThan(ROLE_HIERARCHY.admin);
      expect(ROLE_HIERARCHY.admin).toBeLessThan(ROLE_HIERARCHY.owner);
    });
  });
});
