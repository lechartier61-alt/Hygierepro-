# Configuration Railway — hygiesafe.com

Pour le domaine officiel, utiliser dans le service HygieSafe :

```text
APP_URL=https://www.hygiesafe.com
PUBLIC_SITE_URL=https://www.hygiesafe.com
ALLOWED_ORIGINS=https://www.hygiesafe.com,https://hygiesafe.com
SESSION_COOKIE_SECURE=true
```

Conserver également :

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_SSL=false
UPLOAD_DIR=/data/uploads
RESEND_FROM=HygieSafe <noreply@mail.hygiesafe.com>
RESEND_API_KEY=re_...
```

Le `Target Port` du domaine Railway doit correspondre au port exposé par le déploiement. HygieSafe écoute sur `0.0.0.0:$PORT`.

## Pourquoi « Origine non autorisée » apparaissait

Le site était ouvert depuis `https://www.hygiesafe.com`, alors que `APP_URL` et `PUBLIC_SITE_URL` contenaient encore l'ancien domaine Railway. La v6.4.4 accepte désormais une requête réellement same-origin selon le Host reçu par Railway et permet aussi de déclarer explicitement les alias dans `ALLOWED_ORIGINS`.
