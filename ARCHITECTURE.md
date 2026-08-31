# Architecture HygieSafe v6.7.0

- **Frontend** : HTML/CSS/JavaScript responsive + PWA/service worker.
- **API** : Node.js 22 + Express 5.
- **Base** : PostgreSQL, séparation multi-entreprise par `organization_id`, 29 migrations.
- **Authentification** : Argon2id, sessions serveur hachées, cookies sécurisés, CSRF, vérification e-mail, limiteurs PostgreSQL.
- **Admin** : session dédiée + TOTP 2FA avec secret chiffré.
- **Fichiers** : contrôle de signature, stockage privé S3/Volume, accès soumis à l’organisation et au rôle, preuves liées non supprimables.
- **Preuves HACCP** : horodatage serveur pour l’Employé, révisions avant correction/annulation, annulation logique des preuves plutôt que suppression physique.
- **Journées guidées** : planification par jour et employé, modification du jour par le Gérant/Responsable, étapes verrouillées lorsqu’elles sont déjà actives/terminées, quantité cible/réelle, blocages, photos et historique.
- **Scanner** : OCR, classification automatique, sources produit externes et mémoire validée par l’établissement.
- **Facturation** : Stripe Checkout, portail, webhooks signés/idempotents.
- **E-mails** : Resend en priorité, SMTP de secours.
- **Sauvegardes** : ZIP streaming réservé au Gérant avec données métier, médias, révisions, journées guidées et acceptations juridiques.
- **Juridique/RGPD** : mentions légales, confidentialité, CGU, CGV B2B, DPA article 28, liste de sous-traitants et preuve d’acceptation à l’inscription.
- **Exploitation** : migrations automatiques, healthcheck, request IDs, incidents, rétention et arrêt gracieux.

## Routage principal
- `/api/auth` : comptes, sessions, inscription et acceptation juridique.
- `/api/onboarding` : configuration initiale.
- `/api/records` : contrôles HACCP, températures, traçabilité et autres données métier.
- `/api/workdays` : journées guidées, étapes, preuves, blocages et modifications du jour.
- `/api/suppliers` : fournisseurs et commandes avec filtrage par rôle.
- `/api/media` : médias privés et scanner.
- `/api/reports` : rapports / exports.
- `/api/billing` : Stripe.
- `/api/account` : profil, export, suppression.
- `/api/admin` : supervision globale.

## Base de données v6.7.0
La migration `029_v670_production_reliability.sql` ajoute :
- `actual_quantity` sur les étapes ;
- données de blocage et photo associée ;
- `record_revisions` pour préserver l’état antérieur d’une preuve ;
- `legal_acceptances` pour tracer la version des documents contractuels acceptés.
