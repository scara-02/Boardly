const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to an in-memory MongoDB replica set.
 * Replica set is required for transaction support.
 */
async function connectDB() {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Explicitly create all collections to avoid transaction errors
  // MongoDB doesn't allow implicit collection creation inside a transaction 
  // (or it throws "already in use" errors on concurrent access)
  const models = mongoose.modelNames();
  for (const modelName of models) {
    await mongoose.model(modelName).init(); // Creates collection and waits for indexes
  }
}

/**
 * Drop the database and close the connection.
 */
async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

/**
 * Clean all collections between tests.
 */
async function clearDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

module.exports = { connectDB, closeDB, clearDB };
