# HygieSafe v6.5.3 — Correction accès administrateur

- Création automatique du premier compte Admin au démarrage si la table `admin_users` est vide.
- Utilise `ADMIN_EMAIL` et `ADMIN_PASSWORD` (14 caractères minimum).
- Ne modifie jamais un compte Admin existant lors des redéploiements.
- Ajout de `/api/admin/auth/status` pour diagnostiquer l'initialisation sans exposer d'identifiant ni de secret.
- Première connexion 2FA : message clair si `FIELD_ENCRYPTION_KEY` manque au lieu d'un blocage silencieux.
- Correction de l'appel asynchrone du setup 2FA dans l'interface Admin.
- Messages de connexion Admin plus explicites et bouton protégé pendant la requête.
