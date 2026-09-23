const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/multitenant_saas',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    refreshExpiryMs: parseDuration(process.env.JWT_REFRESH_EXPIRY || '7d'),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  rateLimits: {
    free: { maxRequests: 100, windowMs: 60 * 60 * 1000 },   // 100 req/hr
    pro: { maxRequests: 5000, windowMs: 60 * 60 * 1000 },    // 5000 req/hr
  },

  tenantDefaults: {
    free: { maxUsers: 5, maxBoards: 10 },
    pro: { maxUsers: 100, maxBoards: 500 },
  },
};

/**
 * Parse a duration string (e.g., '15m', '7d', '1h') into milliseconds.
 */
function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

module.exports = config;
