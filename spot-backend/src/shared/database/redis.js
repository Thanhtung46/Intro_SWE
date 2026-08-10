import Redis from 'ioredis';
import config from '../config/env.js';
import logger from '../utils/logger.js';

const redis = new Redis({
  host: config.redis.host || 'localhost',
  port: Number(config.redis.port) || 6379,
  db: Number(config.redis.db) || 0,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 5) {
      return null;
    }
    return Math.min(times * 200, 1000);
  },
});

redis.on('error', (err) => {
  logger.warn('Redis connection error', { error: err.message });
});

export default redis;
