const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../setup');
const app = require('../../src/app');
const Tenant = require('../../src/models/Tenant');
const User = require('../../src/models/User');
const RefreshToken = require('../../src/models/RefreshToken');

beforeAll(async () => await connectDB());
afterAll(async () => await closeDB());
afterEach(async () => await clearDB());


describe('Auth Flow — Integration Tests', () => {
  let signupData;

  beforeEach(() => {
    signupData = {
      companyName: 'Acme Corp',
      slug: 'acme-corp',
      name: 'John Doe',
      email: 'john@acme.com',
      password: 'securePassword123',
    };
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new tenant and owner user', async () => {
      const res = await request(app).post('/api/auth/signup').send(signupData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.name).toBe('John Doe');
      expect(res.body.data.user.role).toBe('owner');
      expect(res.body.data.tenant.slug).toBe('acme-corp');

      // Verify in DB
      const tenant = await Tenant.findOne({ slug: 'acme-corp' });
      expect(tenant).not.toBeNull();
      const user = await User.findOne({ email: 'john@acme.com' });
      expect(user).not.toBeNull();
      expect(user.role).toBe('owner');
    });

    it('should reject duplicate tenant slug', async () => {
      await request(app).post('/api/auth/signup').send(signupData);
      const res = await request(app).post('/api/auth/signup').send({
        ...signupData,
        email: 'other@acme.com',
      });

      expect(res.status).toBe(409);
    });

    it('should reject invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ companyName: 'A', slug: 'x', name: '', email: 'bad', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/signup').send(signupData);
    });

    it('should log in with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'john@acme.com',
        password: 'securePassword123',
        tenantSlug: 'acme-corp',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'john@acme.com',
        password: 'wrongPassword',
        tenantSlug: 'acme-corp',
      });

      expect(res.status).toBe(401);
    });

    it('should reject wrong tenant slug', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'john@acme.com',
        password: 'securePassword123',
        tenantSlug: 'wrong-slug',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh — Token Rotation', () => {
    let tokens;

    beforeEach(async () => {
      const signupRes = await request(app).post('/api/auth/signup').send(signupData);
      tokens = signupRes.body.data;
    });

    it('should issue new tokens and rotate the refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: tokens.refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // New refresh token should be different from the old one
      expect(res.body.data.refreshToken).not.toBe(tokens.refreshToken);
    });

    it('should reject the old refresh token after rotation (reuse detection)', async () => {
      // First refresh — should succeed
      const firstRefresh = await request(app).post('/api/auth/refresh').send({
        refreshToken: tokens.refreshToken,
      });
      expect(firstRefresh.status).toBe(200);

      // Second use of the SAME old token — reuse detection triggers
      const reuseAttempt = await request(app).post('/api/auth/refresh').send({
        refreshToken: tokens.refreshToken,
      });
      expect(reuseAttempt.status).toBe(401);
      expect(reuseAttempt.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // Even the new token from the first refresh should now be revoked (entire family)
      const familyRevoked = await request(app).post('/api/auth/refresh').send({
        refreshToken: firstRefresh.body.data.refreshToken,
      });
      expect(familyRevoked.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should invalidate the refresh token', async () => {
      const signupRes = await request(app).post('/api/auth/signup').send(signupData);
      const { refreshToken } = signupRes.body.data;

      // Logout
      const logoutRes = await request(app).post('/api/auth/logout').send({ refreshToken });
      expect(logoutRes.status).toBe(200);

      // Refresh should fail after logout
      const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });
  });
});
