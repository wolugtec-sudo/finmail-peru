import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Railway/Postgres gestionado suele requerir SSL. En local normalmente no.
const isLocal = (process.env.DATABASE_URL || '').includes('localhost');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('[db] error inesperado en el pool de Postgres:', err.message);
});

export async function query(text, params) {
  return pool.query(text, params);
}
