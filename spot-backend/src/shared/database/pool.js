import pg from 'pg';
import { buildPoolConfig } from './config.js';

const pool = new pg.Pool(buildPoolConfig());

export default pool;
