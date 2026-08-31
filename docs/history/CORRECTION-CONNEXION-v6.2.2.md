# HygiePro v6.2.2 — correction connexion Railway

## Problème corrigé

Les requêtes de connexion (`POST /api/auth/login`) pouvaient être refusées avec **« Origine non autorisée »** lorsque `APP_URL` / `PUBLIC_SITE_URL` ne correspondaient pas exactement au domaine réellement utilisé dans le navigateur.

La protection CSRF/CORS reste active, mais accepte maintenant aussi **l’origine réelle du service qui sert la page** (`req.protocol + Host`). Cela rend le déploiement Railway plus robuste, notamment lors d’un changement de domaine Railway ou de l’ajout d’un domaine personnalisé.

La connexion traite également un ancien hash de mot de passe invalide comme de mauvais identifiants au lieu de provoquer une erreur 500.

## Variables Railway à conserver

```text
NODE_ENV=production
APP_URL=https://VOTRE-DOMAINE-PUBLIC
PUBLIC_SITE_URL=https://VOTRE-DOMAINE-PUBLIC
SESSION_COOKIE_SECURE=true
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_SSL=false
```

`APP_URL` et `PUBLIC_SITE_URL` doivent contenir l’URL publique exacte, avec `https://` et sans chemin final.

## Vérification après redéploiement

1. `GET /health` doit répondre `ok: true` et `version: 6.2.2`.
2. Ouvrir `/login.html`.
3. Se connecter avec un compte existant.
4. Si une erreur 500 subsiste, consulter les logs Railway : elle sera alors liée à PostgreSQL ou aux données du compte, et non au contrôle d’origine.
