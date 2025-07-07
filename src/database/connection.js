import pkg from 'pg';
const { Pool } = pkg;
import config from '../configs/db-config.js';

const pool = new Pool(config);

export default pool;