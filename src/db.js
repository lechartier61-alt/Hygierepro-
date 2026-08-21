import pg from 'pg';
import { config } from './config.js';
const { Pool } = pg;
if (!config.databaseUrl) {
  throw new Error('[HygieSafe] DATABASE_URL obligatoire. Sur Railway : ajoutez PostgreSQL puis créez dans le service HygieSafe une variable de référence DATABASE_URL vers le service Postgres.');
}
export const pool = new Pool({ connectionString: config.databaseUrl, ssl: config.databaseSsl ? { rejectUnauthorized: false } : false, max: 12 });
export const q = (text, params=[]) => pool.query(text, params);
export async function tx(fn){ const c=await pool.connect(); try{ await c.query('BEGIN'); const out=await fn(c); await c.query('COMMIT'); return out; }catch(e){ await c.query('ROLLBACK'); throw e; }finally{ c.release(); } }
