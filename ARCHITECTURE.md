# Architecture HygieSafe v6.3.2

- **Frontend** : HTML/CSS/JavaScript responsive + service worker PWA.
- **API** : Node.js 22 + Express 5.
- **Base** : PostgreSQL, séparation multi-entreprise par `organization_id`.
- **Authentification** : Argon2id, sessions serveur hachées, CSRF, vérification e-mail.
- **Admin** : session dédiée + TOTP 2FA chiffrée.
- **Fichiers** : signature réelle, stockage privé, S3 ou Railway Volume persistant.
- **Facturation** : Stripe Checkout, portail, webhooks signés/idempotents, verrou de checkout, promo atomique.
- **E-mails** : Resend en priorité pour vérification, invitations et réinitialisation ; SMTP de secours.
- **Sauvegardes** : ZIP complet généré en streaming, réservé au gérant, avec classement année/mois/jour et pièces jointes.
- **Sécurité HTTP** : Helmet/CSP/HSTS, contrôle origine, limites de débit.
- **Exploitation** : migrations automatiques, healthcheck, request IDs, incidents, rétention, arrêt gracieux.

## Routage principal

- `/api/auth` : comptes, sessions, vérification e-mail, équipe.
- `/api/onboarding` : configuration initiale.
- `/api/records` : HACCP, températures, stock, traçabilité, tâches, pointage.
- `/api/suppliers` : fournisseurs et commandes.
- `/api/media` : fichiers et scanner.
- `/api/reports` : rapports / exports.
- `/api/billing` : Stripe.
- `/api/account` : profil, export, suppression.
- `/api/admin` : administration globale.
