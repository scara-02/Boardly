const { createClient } = require('redis');
const config = require('../config');

let client = null;
let isConnected = false;

/**
 * Get or create the Redis client singleton.
 * Returns null in test environment to avoid Redis dependency in tests.
 */
async function getRedisClient() {
  if (config.isTest) return null;
  if (client && isConnected) return client;

  try {
    client = createClient({ url: config.redis.url });

    client.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
      isConnected = false;
    });

    client.on('connect', () => {
      console.log('[Redis] Connected');
      isConnected = true;
    });

    client.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    client.on('end', () => {
      console.log('[Redis] Connection closed');
      isConnected = false;
    });

    await client.connect();
    return client;
  } catch (err) {
    console.error('[Redis] Failed to connect:', err.message);
    isConnected = false;
    return null;
  }
}

/**
 * Check if Redis is currently connected and available.
 */
function isRedisAvailable() {
  return client !== null && isConnected;
}

/**
 * Gracefully close the Redis connection.
 */
async function closeRedis() {
  if (client) {
    try {
      await client.quit();
    } catch (err) {
      console.error('[Redis] Error closing connection:', err.message);
    }
    client = null;
    isConnected = false;
  }
}

module.exports = { getRedisClient, isRedisAvailable, closeRedis };
