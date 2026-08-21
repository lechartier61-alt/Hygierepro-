import { q } from '../db.js';
import { hashPassword } from '../utils/crypto.js';

function validEmail(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim());
}

/**
 * Initialise le tout premier compte administrateur à partir des variables Railway.
 * Sécurité : cette fonction ne modifie JAMAIS un compte admin déjà présent.
 */
export async function bootstrapFirstAdmin(){
  const stats=(await q(`SELECT count(*)::int total, count(*) FILTER (WHERE active)::int active FROM admin_users`)).rows[0];
  if(Number(stats?.total||0)>0){
    if(Number(stats?.active||0)===0)console.warn('[HygieSafe][Admin] Un compte administrateur existe mais aucun n’est actif. Utilisez npm run seed:admin pour le réactiver explicitement.');
    return {created:false,reason:'already_initialized'};
  }

  const email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
  const password=String(process.env.ADMIN_PASSWORD||'');
  if(!email||!password){
    console.warn('[HygieSafe][Admin] Aucun administrateur initialisé. Ajoutez ADMIN_EMAIL et ADMIN_PASSWORD dans Railway puis redéployez.');
    return {created:false,reason:'missing_env'};
  }
  if(!validEmail(email)){
    console.warn('[HygieSafe][Admin] ADMIN_EMAIL n’est pas une adresse e-mail valide.');
    return {created:false,reason:'invalid_email'};
  }
  if(password.length<14){
    console.warn('[HygieSafe][Admin] ADMIN_PASSWORD doit contenir au moins 14 caractères.');
    return {created:false,reason:'weak_password'};
  }

  const passwordHash=await hashPassword(password);
  const rows=await q(`INSERT INTO admin_users(email,password_hash,name,active)
    VALUES($1,$2,'Super Admin',true)
    ON CONFLICT DO NOTHING
    RETURNING id,email`,[email,passwordHash]);
  if(rows.rows[0]){
    console.log(`[HygieSafe][Admin] Premier compte administrateur créé : ${email}`);
    return {created:true,email};
  }
  return {created:false,reason:'race_or_conflict'};
}
