# Sécurité — HygieSafe v6.7.0

## Protections actives
- Argon2id pour les mots de passe.
- Sessions aléatoires stockées sous forme hachée.
- Cookies HttpOnly / Secure en production / SameSite.
- Protection CSRF et contrôle strict des origines.
- Rate limiting partagé dans PostgreSQL ; mot de passe oublié limité par IP et par adresse hachée.
- Helmet / CSP / HSTS / Referrer-Policy / Permissions-Policy.
- Isolation par `organization_id` et restrictions de rôle owner/manager/employee.
- Les Employés ne peuvent plus parcourir l’historique global de l’organisation ni les informations sensibles fournisseurs.
- Horodatage officiel des nouvelles preuves Employé imposé par le serveur.
- Révisions enregistrées avant correction ; preuve HACCP annulée logiquement au lieu d’être supprimée physiquement.
- Contrôle renforcé des preuves liées aux journées : organisation, type attendu, auteur, date postérieure au démarrage et non-réutilisation.
- Fichiers validés par signature réelle ; SVG actif interdit ; stockage privé.
- Fichier déjà utilisé comme preuve non supprimable, y compris par un rôle supérieur.
- 2FA Admin TOTP, secret chiffré AES-256-GCM avec `FIELD_ENCRYPTION_KEY` et anti-rejeu.
- Webhooks Stripe signés et idempotents.
- Erreurs 500 sans stack publique, identifiant de requête/incident.
- Acceptations CGV/CGU/DPA/prise de connaissance confidentialité historisées pour les nouvelles inscriptions.

## Obligatoire avant production
- Générer et conserver une `FIELD_ENCRYPTION_KEY` stable et aléatoire.
- Configurer stockage persistant privé S3 ou Railway Volume.
- Configurer Resend et vérifier le domaine d’envoi.
- Configurer le secret du webhook Stripe.
- Générer un `package-lock.json` réel dans un environnement connecté, le versionner, puis utiliser `npm ci`.
- Compléter `LEGAL_EMAIL`, `LEGAL_PHONE`, `LEGAL_PRIVACY_EMAIL` et confirmer `LEGAL_PUBLISHER`.
- Vérifier et accepter les DPA/conditions des sous-traitants réellement utilisés (Railway, Resend, Stripe, stockage).
- Tester une restauration de sauvegarde, pas seulement sa création.
- Faire tourner la suite de tests complète dans une préproduction avec PostgreSQL et dépendances installées.

## Principe d’intégrité des preuves
Une donnée de conformité déjà utilisée comme preuve ne doit pas disparaître silencieusement. HygieSafe conserve l’état antérieur dans `record_revisions` et utilise une annulation tracée pour les preuves concernées.
