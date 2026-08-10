import Redis from 'ioredis';
import config from '../config/env.js';

const redis = new Redis({
  host: config.redis.host || 'localhost',
  port: Number(config.redis.port) || 6379,
  db: Number(config.redis.db) || 0,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export default redis;
