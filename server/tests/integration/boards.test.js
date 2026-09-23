const request = require('supertest');
const { connectDB, closeDB, clearDB } = require('../setup');
const app = require('../../src/app');

beforeAll(async () => await connectDB());
afterAll(async () => await closeDB());
afterEach(async () => await clearDB());


describe('Board/List/Card CRUD — Integration Tests', () => {
  let ownerTokens;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/signup').send({
      companyName: 'CRUD Corp',
      slug: 'crud-corp',
      name: 'Owner User',
      email: 'owner@crud.com',
      password: 'password123!',
    });
    ownerTokens = res.body.data;
  });

  const auth = () => ({ Authorization: `Bearer ${ownerTokens.accessToken}` });

  describe('Boards', () => {
    it('should create, list, update, and delete a board', async () => {
      // Create
      const createRes = await request(app)
        .post('/api/boards').set(auth())
        .send({ name: 'Sprint Board' });
      expect(createRes.status).toBe(201);
      expect(createRes.body.data.name).toBe('Sprint Board');
      const boardId = createRes.body.data._id;

      // List
      const listRes = await request(app).get('/api/boards').set(auth());
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Get by ID
      const getRes = await request(app).get(`/api/boards/${boardId}`).set(auth());
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.name).toBe('Sprint Board');

      // Update
      const updateRes = await request(app)
        .patch(`/api/boards/${boardId}`).set(auth())
        .send({ name: 'Renamed Board' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Renamed Board');

      // Delete
      const deleteRes = await request(app).delete(`/api/boards/${boardId}`).set(auth());
      expect(deleteRes.status).toBe(200);

      // Verify deleted
      const verifyRes = await request(app).get(`/api/boards/${boardId}`).set(auth());
      expect(verifyRes.status).toBe(404);
    });
  });

  describe('Lists', () => {
    let boardId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/boards').set(auth())
        .send({ name: 'Board for Lists' });
      boardId = res.body.data._id;
    });

    it('should create lists with auto-incrementing positions', async () => {
      const list1 = await request(app)
        .post(`/api/boards/${boardId}/lists`).set(auth())
        .send({ name: 'To Do' });
      expect(list1.status).toBe(201);
      expect(list1.body.data.position).toBe(0);

      const list2 = await request(app)
        .post(`/api/boards/${boardId}/lists`).set(auth())
        .send({ name: 'In Progress' });
      expect(list2.body.data.position).toBe(1);

      const list3 = await request(app)
        .post(`/api/boards/${boardId}/lists`).set(auth())
        .send({ name: 'Done' });
      expect(list3.body.data.position).toBe(2);
    });

    it('should list all lists for a board in order', async () => {
      await request(app).post(`/api/boards/${boardId}/lists`).set(auth()).send({ name: 'A' });
      await request(app).post(`/api/boards/${boardId}/lists`).set(auth()).send({ name: 'B' });

      const res = await request(app).get(`/api/boards/${boardId}/lists`).set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].name).toBe('A');
      expect(res.body.data[1].name).toBe('B');
    });
  });

  describe('Cards', () => {
    let boardId, listId;

    beforeEach(async () => {
      const boardRes = await request(app)
        .post('/api/boards').set(auth())
        .send({ name: 'Card Board' });
      boardId = boardRes.body.data._id;

      const listRes = await request(app)
        .post(`/api/boards/${boardId}/lists`).set(auth())
        .send({ name: 'Backlog' });
      listId = listRes.body.data._id;
    });

    it('should create and list cards in a list', async () => {
      await request(app)
        .post(`/api/lists/${listId}/cards`).set(auth())
        .send({ title: 'Card 1' });
      await request(app)
        .post(`/api/lists/${listId}/cards`).set(auth())
        .send({ title: 'Card 2', description: 'Desc' });

      const res = await request(app).get(`/api/lists/${listId}/cards`).set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should move a card between lists', async () => {
      // Create a second list
      const list2Res = await request(app)
        .post(`/api/boards/${boardId}/lists`).set(auth())
        .send({ name: 'In Progress' });
      const list2Id = list2Res.body.data._id;

      // Create a card in first list
      const cardRes = await request(app)
        .post(`/api/lists/${listId}/cards`).set(auth())
        .send({ title: 'Movable Card' });
      const cardId = cardRes.body.data._id;

      // Move card to second list
      const moveRes = await request(app)
        .patch(`/api/cards/${cardId}`).set(auth())
        .send({ listId: list2Id });
      expect(moveRes.status).toBe(200);
      expect(moveRes.body.data.listId.toString()).toBe(list2Id);

      // Verify it's in the new list
      const newListCards = await request(app).get(`/api/lists/${list2Id}/cards`).set(auth());
      expect(newListCards.body.data).toHaveLength(1);
      expect(newListCards.body.data[0].title).toBe('Movable Card');

      // Verify it's gone from the old list
      const oldListCards = await request(app).get(`/api/lists/${listId}/cards`).set(auth());
      expect(oldListCards.body.data).toHaveLength(0);
    });
  });
});
