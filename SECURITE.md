# Sécurité — HygieSafe v6.3.2

## Protections actives
- Argon2id pour les mots de passe et rehash automatique.
- Jetons de session aléatoires stockés uniquement sous forme hachée.
- Cookies HttpOnly / Secure production / SameSite.
- CSRF pour les actions authentifiées.
- Origines autorisées strictement configurées en production.
- Rate limiting sensible partagé dans PostgreSQL.
- Helmet / CSP / HSTS / Referrer-Policy / Permissions-Policy.
- Séparation par `organization_id` et rôles owner/manager/employee.
- Vérification e-mail obligatoire avant les modules métier.
- 2FA admin TOTP, secret chiffré AES-256-GCM avec `FIELD_ENCRYPTION_KEY`.
- Protection contre la réutilisation immédiate d’un code TOTP.
- Fichiers validés par signature réelle ; SVG actif interdit.
- Chemins de stockage neutralisés et stockage privé no-store.
- Stripe webhook signé et événements idempotents.
- Nettoyage des jetons, sessions, événements et incidents.
- Erreurs 500 avec identifiant de requête sans exposition de stack au client.

## Obligatoire avant production
- Générer `FIELD_ENCRYPTION_KEY` aléatoire (32+ caractères).
- Configurer S3 ou un Railway Volume avec `UPLOAD_DIR`.
- Configurer Resend avant d’ouvrir l’inscription (`RESEND_API_KEY` et `RESEND_FROM`). SMTP peut rester en secours.
- Configurer `STRIPE_WEBHOOK_SECRET` si Stripe est activé.
- Ne jamais committer `.env`, clés Stripe, mots de passe, clés Resend ou secrets SMTP.
- Les sauvegardes ZIP contiennent des données métier et photos : les conserver dans un emplacement sécurisé et limiter leur accès au gérant.
- Exécuter les tests de smoke contre l’environnement de préproduction.
