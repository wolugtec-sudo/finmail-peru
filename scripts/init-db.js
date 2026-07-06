import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf-8');
  await pool.query(sql);
  console.log('✓ Tablas creadas / verificadas correctamente.');
  await pool.end();
}

main().catch((e) => {
  console.error('Error creando tablas:', e.message);
  process.exit(1);
});
