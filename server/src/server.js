const mongoose = require('mongoose');
const config = require('./config');
const app = require('./app');
const { getRedisClient, closeRedis } = require('./utils/redis');

async function startServer() {
  try {
    // ── Connect to MongoDB ─────────────────────────────────────
    console.log('[MongoDB] Connecting...');
    let uri = config.mongodb.uri;
    
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log('[MongoDB] Connected successfully');
    } catch (dbErr) {
      if (config.nodeEnv === 'development') {
        console.warn('[MongoDB] Local DB connection failed. Starting an in-memory Replica Set for development...');
        const { MongoMemoryReplSet } = require('mongodb-memory-server');
        const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
        uri = replSet.getUri();
        await mongoose.connect(uri);
        console.log('[MongoDB] Connected to In-Memory Replica Set');
      } else {
        throw dbErr;
      }
    }

    // ── Connect to Redis ───────────────────────────────────────
    try {
      await getRedisClient();
    } catch (err) {
      console.warn('[Redis] Could not connect — rate limiting will be disabled:', err.message);
    }

    // ── Start HTTP server ──────────────────────────────────────
    const server = app.listen(config.port, () => {
      console.log(`\n Multi-Tenant SaaS API running on port ${config.port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Health check: http://localhost:${config.port}/api/health\n`);
    });

    // ── Graceful shutdown ──────────────────────────────────────
    const gracefulShutdown = async (signal) => {
      console.log(`\n[${signal}] Shutting down gracefully...`);
      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log('[MongoDB] Connection closed');
          await closeRedis();
          console.log('[Redis] Connection closed');
          process.exit(0);
        } catch (err) {
          console.error('Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
