const request = require('supertest');
const { connectDB, closeDB, clearDB } = require('../setup');
const app = require('../../src/app');

beforeAll(async () => await connectDB());
afterAll(async () => await closeDB());
afterEach(async () => await clearDB());


describe('Tenant Isolation — Integration Tests', () => {
  let tenantA, tenantB;

  beforeEach(async () => {
    // Create Tenant A
    const resA = await request(app).post('/api/auth/signup').send({
      companyName: 'Company Alpha',
      slug: 'company-alpha',
      name: 'Alice Owner',
      email: 'alice@alpha.com',
      password: 'password123A',
    });
    tenantA = resA.body.data;

    // Create Tenant B
    const resB = await request(app).post('/api/auth/signup').send({
      companyName: 'Company Beta',
      slug: 'company-beta',
      name: 'Bob Owner',
      email: 'bob@beta.com',
      password: 'password123B',
    });
    tenantB = resB.body.data;
  });

  describe('Cross-tenant board access', () => {
    let boardA;

    beforeEach(async () => {
      // Create a board in Tenant A
      const res = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .send({ name: 'Alpha Secret Board' });
      boardA = res.body.data;
    });

    it('should NOT allow Tenant B user to list Tenant A boards', async () => {
      const res = await request(app)
        .get('/api/boards')
        .set('Authorization', `Bearer ${tenantB.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0); // no boards visible
    });

    it('should NOT allow Tenant B user to fetch Tenant A board by ID', async () => {
      const res = await request(app)
        .get(`/api/boards/${boardA._id}`)
        .set('Authorization', `Bearer ${tenantB.accessToken}`);

      // Returns 404, not 403 — avoid leaking existence of the resource
      expect(res.status).toBe(404);
    });

    it('should NOT allow Tenant B user to update Tenant A board', async () => {
      const res = await request(app)
        .patch(`/api/boards/${boardA._id}`)
        .set('Authorization', `Bearer ${tenantB.accessToken}`)
        .send({ name: 'Hacked Board Name' });

      expect(res.status).toBe(404);
    });

    it('should NOT allow Tenant B user to delete Tenant A board', async () => {
      const res = await request(app)
        .delete(`/api/boards/${boardA._id}`)
        .set('Authorization', `Bearer ${tenantB.accessToken}`);

      expect(res.status).toBe(404);

      // Verify board still exists for Tenant A
      const verify = await request(app)
        .get(`/api/boards/${boardA._id}`)
        .set('Authorization', `Bearer ${tenantA.accessToken}`);
      expect(verify.status).toBe(200);
      expect(verify.body.data.name).toBe('Alpha Secret Board');
    });
  });

  describe('Cross-tenant card access', () => {
    it('should prevent card operations across tenants', async () => {
      // Create board + list + card in Tenant A
      const boardRes = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .send({ name: 'Board A' });
      const boardId = boardRes.body.data._id;

      const listRes = await request(app)
        .post(`/api/boards/${boardId}/lists`)
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .send({ name: 'List A' });
      const listId = listRes.body.data._id;

      const cardRes = await request(app)
        .post(`/api/lists/${listId}/cards`)
        .set('Authorization', `Bearer ${tenantA.accessToken}`)
        .send({ title: 'Secret Card' });
      const cardId = cardRes.body.data._id;

      // Tenant B tries to read the card
      const readRes = await request(app)
        .get(`/api/cards/${cardId}`)
        .set('Authorization', `Bearer ${tenantB.accessToken}`);
      expect(readRes.status).toBe(404);

      // Tenant B tries to update the card
      const updateRes = await request(app)
        .patch(`/api/cards/${cardId}`)
        .set('Authorization', `Bearer ${tenantB.accessToken}`)
        .send({ title: 'Hacked' });
      expect(updateRes.status).toBe(404);

      // Tenant B tries to delete the card
      const deleteRes = await request(app)
        .delete(`/api/cards/${cardId}`)
        .set('Authorization', `Bearer ${tenantB.accessToken}`);
      expect(deleteRes.status).toBe(404);
    });
  });

  describe('Cross-tenant user listing', () => {
    it('should NOT expose Tenant A users to Tenant B', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tenantB.accessToken}`);

      expect(res.status).toBe(200);
      // Should only see Tenant B's own users
      res.body.data.forEach((user) => {
        expect(user.tenantId.toString()).toBe(tenantB.tenant.id);
      });
    });
  });
});
