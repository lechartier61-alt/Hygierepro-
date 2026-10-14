import { pool } from '../src/db.js';import { hashPassword } from '../src/utils/crypto.js';
const email=(process.env.ADMIN_EMAIL||'').toLowerCase(),pass=process.env.ADMIN_PASSWORD||'';if(!email||pass.length<14){console.error('ADMIN_EMAIL et ADMIN_PASSWORD (14 caractères minimum) requis.');process.exit(1)}
const ph=await hashPassword(pass);await pool.query(`INSERT INTO admin_users(email,password_hash,name) VALUES($1,$2,'Super Admin') ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,active=true`,[email,ph]);console.log('Super-admin créé/mis à jour :',email);await pool.end();
