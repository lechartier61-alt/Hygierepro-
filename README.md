# HygieSafe v6.5.7

Plateforme SaaS HACCP multi-entreprise : contrôles, températures, DLC/DDM, traçabilité, inventaire, fournisseurs, commandes, documents, équipe, facturation et administration globale.

## État de cette version

Base sécurité issue de la v6.3.0 (audit statique **9,6/10**) + module **Facture → tableau de commandes**, **sauvegarde ZIP complète** et **Resend** pour les e-mails transactionnels.

Nouveautés v6.3.2 : le gérant peut télécharger une sauvegarde ZIP autonome classée année/mois/jour avec traçabilité, photos, documents, factures et commandes. Resend est prioritaire pour les e-mails de vérification, invitation et réinitialisation.

Principaux renforcements : vérification e-mail, sessions/CSRF, rate limiting PostgreSQL, 2FA admin chiffrée, uploads contrôlés par signature, stockage persistant, Stripe idempotent avec verrou Checkout, protection CSV, rétention, PWA et pages légales.

## Installation

```bash
npm install
npm run migrate
npm start
```

En production, les migrations sont exécutées avant le démarrage via Railway/Docker.

## Vérifications

```bash
npm test
npm run test:scanner
npm run test:smoke
```

`test:smoke` nécessite une instance de test avec PostgreSQL et `NODE_ENV=test`.

## Production Railway

À configurer obligatoirement ou selon les fonctions utilisées :

- `DATABASE_URL`
- `APP_URL`
- `PUBLIC_SITE_URL`
- `RAILWAY_PUBLIC_DOMAIN`
- `SESSION_COOKIE_SECURE=true`
- `FIELD_ENCRYPTION_KEY` (32+ caractères)
- stockage persistant : S3 **ou** `UPLOAD_DIR` vers un Railway Volume
- Resend (`RESEND_API_KEY` + `RESEND_FROM`) pour les inscriptions/vérifications e-mail ; SMTP reste disponible en secours
- Stripe + `STRIPE_WEBHOOK_SECRET` lorsque la facturation est activée
- variables `LEGAL_*` avant commercialisation

Voir `DEPLOIEMENT-RAILWAY.md` et `.env.example`.


## Compte test client (v6.3.3)
Dans **Admin → Entreprises**, utilisez **+ Compte test client**. HygieSafe crée un établissement de démonstration avec un gérant propriétaire, une adresse e-mail déjà vérifiée et un mot de passe aléatoire affiché une seule fois. Le compte dispose de 30 jours d’essai et peut être supprimé depuis l’admin après les tests.


## Correctif v6.4.2

La v6.4.2 corrige l'erreur PostgreSQL `42P08 (uuid versus text)` qui empêchait la création d'un nouveau compte dans la v6.4.1.


## Domaine officiel HygieSafe — v6.4.4

Sur Railway, utilisez le domaine public comme URL canonique :

```text
APP_URL=https://www.hygiesafe.com
PUBLIC_SITE_URL=https://www.hygiesafe.com
ALLOWED_ORIGINS=https://www.hygiesafe.com,https://hygiesafe.com
```

Le middleware autorise désormais automatiquement une requête navigateur dont `Origin` correspond réellement au `Host` reçu par Railway, tout en refusant les origines tierces. `ALLOWED_ORIGINS` sert aux alias voulus.

## Mentions légales intégrées

La v6.4.4 préremplit : LIVRICI SOLUTIONS SAS, capital 2 €, SIREN/SIRET, RCS Vannes, TVA, NAF, siège et directeur de publication. L'hébergeur Railway Corporation est également renseigné.

Deux informations doivent encore être saisies dans **Admin > Accueil public > Informations légales** avant ouverture commerciale :

- une adresse e-mail de contact réellement consultée ;
- un numéro de téléphone permettant de joindre l'entreprise.


## v6.4.5 — juridique simplifié
Les mentions légales publiques et le formulaire admin ont été allégés pour retirer les champs redondants ou non nécessaires à l’affichage public. Voir `MODIFICATIONS-v6.4.5.md`.


## v6.4.6 — FAQ dédiée
La section FAQ de l’accueil a été remplacée par une page FAQ dédiée avec 14 questions/réponses, recherche instantanée et liens depuis le pied de page public.


## v6.4.7 — identité HygieSafe + températures liées aux horaires

- Les principaux emojis et pictogrammes génériques de l’interface ont été remplacés par le pack d’icônes officiel HygieSafe (vert, anthracite et blanc).
- Dans **Équipe → Horaires**, le gérant ou un responsable peut définir les jours et heures de travail d’un compte employé.
- Pour un horaire **07:00 → 14:00**, les relevés de température de l’employé n’apparaissent qu’à **07:00 (arrivée)** puis **14:00 (départ)**.
- Une alerte dédiée apparaît sur le compte employé dès qu’un relevé est dû. Après 30 minutes, l’alerte passe en retard.
- Le serveur refuse un relevé employé tenté avant l’heure prévue ou déjà réalisé. Le gérant et les responsables conservent le relevé manuel.
- Les horaires de l’équipe sont inclus dans la sauvegarde ZIP complète.


## v6.5.6 — Base Produits Internet

Le Scanner Pro recherche désormais automatiquement un EAN/GTIN dans cet ordre : **catalogue de l’établissement → nom déjà confirmé dans l’établissement → Open Food Facts → UPCitemdb**. Open Food Facts est consulté à la demande avec attribution ODbL et ses fiches ne sont plus persistées dans le cache propriétaire HygieSafe. UPCitemdb reste un secours et peut utiliser un cache technique dédié.

Après validation, HygieSafe mémorise pour l’établissement le **code-barres et le nom opérationnel confirmé par l’utilisateur**. Les métadonnées externes Open Food Facts (image, allergènes, catégories, etc.) ne sont pas recopiées dans ce catalogue local. Un produit inconnu peut être nommé manuellement puis mémorisé.

La vérification **Verified by GS1** reste accessible par lien depuis le scanner. Elle n’est pas automatisée sans accès API GS1 fourni par une organisation membre GS1.

Variables facultatives :

```text
PRODUCT_LOOKUP_OPENFOODFACTS=true
PRODUCT_LOOKUP_UPCITEMDB=true
PRODUCT_LOOKUP_TIMEOUT_MS=4500
UPCITEMDB_USER_KEY=
UPCITEMDB_KEY_TYPE=3scale
```

Sans clé UPCitemdb, HygieSafe utilise leur endpoint Trial. Les erreurs, délais ou quotas d’une source externe ne bloquent jamais la création d’une traçabilité.


## v6.5.7 — Durcissement production

- corrections Employé limitées à ses propres saisies pendant 15 minutes ; chaque modification journalise l’état avant/après ;
- suppression des preuves médias protégée et refusée lorsqu’un fichier est déjà rattaché ;
- file hors-ligne liée à l’utilisateur et à l’entreprise ;
- sessions Scanner Pro d’un employé isolées de celles de ses collègues ;
- pointeuse d’un employé visible uniquement par lui côté API utilisateur standard ;
- données Open Food Facts consultées à la demande sans cache persistant de fiche ;
- coordonnées juridiques e-mail/téléphone exigées lors de l’enregistrement Admin ;
- CGV et politique de confidentialité complétées ;
- la promesse publique de « sauvegarde serveur automatique » est remplacée par « sauvegarde ZIP complète à télécharger ».
