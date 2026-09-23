const request = require('supertest');
const { connectDB, closeDB, clearDB } = require('../setup');
const app = require('../../src/app');

beforeAll(async () => await connectDB());
afterAll(async () => await closeDB());
afterEach(async () => await clearDB());


describe('Invite Flow — Integration Tests', () => {
  let ownerTokens;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/signup').send({
      companyName: 'Invite Corp',
      slug: 'invite-corp',
      name: 'Owner',
      email: 'owner@invite.com',
      password: 'password123!',
    });
    ownerTokens = res.body.data;
  });

  const ownerAuth = () => ({ Authorization: `Bearer ${ownerTokens.accessToken}` });

  describe('POST /api/invites — Create Invite', () => {
    it('should create an invite and return a token', async () => {
      const res = await request(app)
        .post('/api/invites')
        .set(ownerAuth())
        .send({ email: 'newuser@invite.com', role: 'member' });

      expect(res.status).toBe(201);
      expect(res.body.data.invite.email).toBe('newuser@invite.com');
      expect(res.body.data.invite.role).toBe('member');
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject invite for email already in tenant', async () => {
      const res = await request(app)
        .post('/api/invites')
        .set(ownerAuth())
        .send({ email: 'owner@invite.com', role: 'member' });

      expect(res.status).toBe(409);
    });

    it('should reject duplicate pending invites', async () => {
      await request(app)
        .post('/api/invites')
        .set(ownerAuth())
        .send({ email: 'dup@invite.com', role: 'member' });

      const res = await request(app)
        .post('/api/invites')
        .set(ownerAuth())
        .send({ email: 'dup@invite.com', role: 'admin' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/invites/:token/accept — Accept Invite', () => {
    it('should allow a new user to accept an invite and join the tenant', async () => {
      // Create invite
      const inviteRes = await request(app)
        .post('/api/invites')
        .set(ownerAuth())
        .send({ email: 'jane@invite.com', role: 'member' });
      const { token } = inviteRes.body.data;

      // Accept invite
      const acceptRes = await request(app)
        .post(`/api/invites/${token}/accept`)
        .send({ name: 'Jane Doe', password: 'janepass123' });

      expect(acceptRes.status).toBe(201);
      expect(acceptRes.body.data.user.name).toBe('Jane Doe');
      expect(acceptRes.body.data.user.role).toBe('member');

      // Verify the new user can log in
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'jane@invite.com',
        password: 'janepass123',
        tenantSlug: 'invite-corp',
      });
      expect(loginRes.status).toBe(200);
    });

    it('should reject an already-used invite token', async () => {
      const inviteRes = await request(app)
        .post('/api/invites')
        .set(ownerAuth())
        .send({ email: 'once@invite.com', role: 'viewer' });
      const { token } = inviteRes.body.data;

      // Accept once
      await request(app)
        .post(`/api/invites/${token}/accept`)
        .send({ name: 'Once User', password: 'oncepass1234' });

      // Try to use same token again
      const reuse = await request(app)
        .post(`/api/invites/${token}/accept`)
        .send({ name: 'Another User', password: 'anotherpass1' });

      expect(reuse.status).toBe(400);
      expect(reuse.body.error.code).toBe('INVITE_USED');
    });

    it('should reject an invalid invite token', async () => {
      const res = await request(app)
        .post('/api/invites/invalidtokenhere/accept')
        .send({ name: 'Bad User', password: 'badpass12345' });

      expect(res.status).toBe(404);
    });
  });
});
