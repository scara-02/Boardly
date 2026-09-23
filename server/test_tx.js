const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

async function testTransactions() {
  console.log('Starting replica set...');
  const mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  
  const uri = mongoServer.getUri();
  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  
  const schema = new mongoose.Schema({ name: String });
  const TestModel = mongoose.model('Test', schema);
  
  await TestModel.createCollection(); // required for transactions

  console.log('Starting session...');
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    console.log('Transaction started. Saving doc...');
    await TestModel.create([{ name: 'foo' }], { session });
    await session.commitTransaction();
    console.log('Transaction committed successfully!');
  } catch (err) {
    console.error('Transaction failed:', err.message);
  } finally {
    session.endSession();
    await mongoose.connection.close();
    await mongoServer.stop();
  }
}

testTransactions().catch(console.error);
