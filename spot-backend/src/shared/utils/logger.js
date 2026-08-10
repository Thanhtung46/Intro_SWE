import winston from 'winston';
import config from '../config/env.js';

const logger = winston.createLogger({
  level: config.log_level || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
