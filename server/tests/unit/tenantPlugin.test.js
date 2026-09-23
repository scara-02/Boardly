const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../setup');
const Tenant = require('../../src/models/Tenant');
const User = require('../../src/models/User');
const Board = require('../../src/models/Board');
const Card = require('../../src/models/Card');

beforeAll(async () => await connectDB());
afterAll(async () => await closeDB());
afterEach(async () => await clearDB());


// Helper: create a tenant
async function createTestTenant(slug = 'test-co') {
  return Tenant.create({ name: 'Test Company', slug, plan: 'pro' });
}

// Helper: create a user within a tenant
async function createTestUser(tenantId, overrides = {}) {
  return User.create({
    tenantId,
    name: overrides.name || 'Test User',
    email: overrides.email || 'test@example.com',
    passwordHash: overrides.password || 'testpassword123',
    role: overrides.role || 'member',
  });
}

describe('Tenant Plugin — Isolation Tests', () => {
  let tenantA, tenantB;

  beforeEach(async () => {
    tenantA = await createTestTenant('company-a');
    tenantB = await createTestTenant('company-b');
  });

  describe('Query scoping via forTenant()', () => {
    it('should only return users belonging to the specified tenant', async () => {
      await createTestUser(tenantA._id, { email: 'alice@a.com', name: 'Alice' });
      await createTestUser(tenantA._id, { email: 'bob@a.com', name: 'Bob' });
      await createTestUser(tenantB._id, { email: 'charlie@b.com', name: 'Charlie' });

      const tenantAUsers = await User.forTenant(tenantA._id).find({});
      const tenantBUsers = await User.forTenant(tenantB._id).find({});

      expect(tenantAUsers).toHaveLength(2);
      expect(tenantBUsers).toHaveLength(1);
      expect(tenantAUsers.every((u) => u.tenantId.toString() === tenantA._id.toString())).toBe(true);
      expect(tenantBUsers[0].name).toBe('Charlie');
    });

    it('should scope findById to the correct tenant', async () => {
      const userA = await createTestUser(tenantA._id, { email: 'alice@a.com' });
      
      // User A exists in tenant A
      const found = await User.forTenant(tenantA._id).findById(userA._id);
      expect(found).not.toBeNull();
      expect(found.email).toBe('alice@a.com');

      // User A should NOT be visible from tenant B's scope
      const notFound = await User.forTenant(tenantB._id).findById(userA._id);
      expect(notFound).toBeNull();
    });

    it('should scope countDocuments to the correct tenant', async () => {
      await createTestUser(tenantA._id, { email: 'a1@a.com' });
      await createTestUser(tenantA._id, { email: 'a2@a.com' });
      await createTestUser(tenantB._id, { email: 'b1@b.com' });

      const countA = await User.forTenant(tenantA._id).countDocuments();
      const countB = await User.forTenant(tenantB._id).countDocuments();

      expect(countA).toBe(2);
      expect(countB).toBe(1);
    });

    it('should scope deleteOne to the correct tenant', async () => {
      const userA = await createTestUser(tenantA._id, { email: 'alice@a.com' });
      const userB = await createTestUser(tenantB._id, { email: 'bob@b.com' });

      // Attempt to delete tenant A's user using tenant B's scope — should not delete
      await User.forTenant(tenantB._id).deleteOne({ _id: userA._id });

      // User A should still exist
      const stillExists = await User.findById(userA._id);
      expect(stillExists).not.toBeNull();

      // Delete using correct tenant scope
      await User.forTenant(tenantA._id).deleteOne({ _id: userA._id });
      const deleted = await User.findById(userA._id);
      expect(deleted).toBeNull();
    });

    it('should scope updateOne to the correct tenant', async () => {
      const userA = await createTestUser(tenantA._id, { email: 'alice@a.com', name: 'Alice' });

      // Attempt to update tenant A's user using tenant B's scope — should not update
      await User.forTenant(tenantB._id).updateOne(
        { _id: userA._id },
        { $set: { name: 'Hacked' } }
      );

      const unchanged = await User.findById(userA._id);
      expect(unchanged.name).toBe('Alice'); // unchanged!

      // Update using correct tenant scope
      await User.forTenant(tenantA._id).updateOne(
        { _id: userA._id },
        { $set: { name: 'Alice Updated' } }
      );

      const updated = await User.findById(userA._id);
      expect(updated.name).toBe('Alice Updated');
    });
  });

  describe('Cross-tenant data access prevention', () => {
    it('should prevent Tenant A user from seeing Tenant B boards', async () => {
      // Create boards in each tenant
      const userA = await createTestUser(tenantA._id, { email: 'alice@a.com' });
      const userB = await createTestUser(tenantB._id, { email: 'bob@b.com' });

      await Board.create({ tenantId: tenantA._id, name: 'Board A', createdBy: userA._id });
      await Board.create({ tenantId: tenantB._id, name: 'Board B', createdBy: userB._id });

      // Tenant A can see only their boards
      const boardsA = await Board.forTenant(tenantA._id).find({});
      expect(boardsA).toHaveLength(1);
      expect(boardsA[0].name).toBe('Board A');

      // Tenant B can see only their boards
      const boardsB = await Board.forTenant(tenantB._id).find({});
      expect(boardsB).toHaveLength(1);
      expect(boardsB[0].name).toBe('Board B');
    });

    it('should prevent cross-tenant board deletion', async () => {
      const userA = await createTestUser(tenantA._id, { email: 'alice@a.com' });
      const boardA = await Board.create({ tenantId: tenantA._id, name: 'Board A', createdBy: userA._id });

      // Try to delete Board A from Tenant B's scope
      await Board.forTenant(tenantB._id).deleteOne({ _id: boardA._id });

      // Board A should still exist
      const stillExists = await Board.findById(boardA._id);
      expect(stillExists).not.toBeNull();
    });
  });

  describe('Save validation', () => {
    it('should reject saving a document without tenantId', async () => {
      const board = new Board({ name: 'No Tenant Board', createdBy: new mongoose.Types.ObjectId() });
      await expect(board.save()).rejects.toThrow();
    });
  });
});
