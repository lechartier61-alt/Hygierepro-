# HygieSafe v6.8.2 — Scanner DLC simplifié

La v6.8.2 simplifie le scanner autour de l'usage principal : **les DLC**. Un clic sur Scanner ouvre la caméra, la date est détectée, puis elle est obligatoirement liée à un produit HygieSafe. Si le produit n'existe pas, il peut être créé directement ; s'il existe mais n'est pas reconnu, HygieSafe propose les produits récents et mémorise ensuite le choix.

Nouvelle migration : `035_scanner_dlc_product_link_v682.sql`.

Lire `START-HERE-v6.8.2.md`, `MODIFICATIONS-v6.8.2.md` et `PRODUCTION-CHECKLIST-v6.8.2.md` avant déploiement.

---

# HygieSafe v6.8.1 — Correctif authentification / CSRF

**v6.8.1** corrige un défaut de la v6.8.0 pouvant afficher `Session de sécurité expirée. Rechargez la page.` sur Connexion, Mot de passe oublié ou Inscription lorsqu'un cookie de session était déjà présent dans le navigateur.

Les routes publiques d'authentification n'exigent plus le jeton CSRF d'une ancienne session ; toutes les actions privées restent protégées par CSRF + Same-Origin. Le cache PWA est également renouvelé en v6.8.1.

Aucune nouvelle migration SQL : la dernière migration reste `034_pilotage_intelligent_v680.sql`.

Lire `START-HERE-v6.8.1.md` et `MODIFICATIONS-v6.8.1.md` avant redéploiement.

---

# HygieSafe v6.8.0 — Pilotage HACCP intelligent

HygieSafe v6.8.0 consolide le suivi HACCP, les journées guidées, le scanner et les équipements avec un nouveau niveau de pilotage : **Centre À traiter, HygieSafe Score, actions correctives, recettes/productions/lots, DLC secondaires, capteurs, notifications, multisite et analyses avancées**.

## Démarrage

```bash
npm install
npm run migrate
npm start
```

Dernière migration : `034_pilotage_intelligent_v680.sql`.

Avant production définitive, lire `START-HERE-v6.8.0.md` et `PRODUCTION-CHECKLIST-v6.8.0.md`.

## Validation de cette release

- syntaxe JavaScript : **84/84 fichiers valides** ;
- suites de validation exécutables sans dépendances externes : **24/24** ;
- contrôles spécifiques v6.8.0 : **153/153** ;
- les tests runtime sauvegarde/e-mails doivent être rejoués après `npm install` ;
- un vrai `package-lock.json` doit être généré et versionné avant le build de production reproductible.

## Fonctions v6.8.0

- Centre **À traiter** et HygieSafe Score ;
- actions correctives guidées ;
- recettes, productions et lots ;
- recherche de rappel produit ;
- règles de DLC secondaires et étiquettes PDF ;
- capteurs connectés avec alertes et non-conformités automatiques ;
- notifications internes et navigateur/PWA ;
- réseau multisite avec rôle par établissement ;
- facturation réseau centralisée ;
- analyses et rapport de pilotage PDF ;
- tutoriel v4 par rôle ;
- sauvegarde complète enrichie.

Voir `MODIFICATIONS-v6.8.0.md`, `TEST-RESULTS-v6.8.0.md` et `AUDIT-FINAL-v6.8.0.md`.

---

## Historique précédent

# HygieSafe v6.7.5

## Nouveautés v6.7.5 — Accueil Premium + audit complet des comptes

- accueil public entièrement refait avec aperçu produit ;
- onglets flottants premium et accessibles ;
- correction du cache PWA pouvant produire un mélange HTML/CSS ;
- stratégie network-first pour CSS/JS ;
- audit statique des comptes Gérant, Responsable, Employé et Admin ;
- 38/38 contrôles rôles ;
- 30/30 contrôles accueil premium ;
- 23 suites exécutables au vert, 492 contrôles/scénarios validés.

Voir `MODIFICATIONS-v6.7.5.md`, `AUDIT-COMPTES-v6.7.5.md`, `TEST-RESULTS-v6.7.5.md` et `START-HERE-v6.7.5.md`.

---

# HygieSafe v6.7.4

Plateforme SaaS HACCP multi-entreprise : contrôles, températures, DLC/DDM, traçabilité, inventaire, fournisseurs, commandes, documents, équipe, facturation et administration globale.

## État de cette version

Base sécurité issue de la v6.3.0 (audit statique **9,6/10**) + module **Facture → tableau de commandes**, **sauvegarde ZIP complète** et **Resend** pour les e-mails transactionnels.

Principaux renforcements : vérification e-mail, sessions/CSRF, rate limiting PostgreSQL, 2FA admin chiffrée, uploads contrôlés par signature, stockage persistant, Stripe idempotent avec verrou Checkout, protection CSV, rétention, PWA et pages légales.

## Nouveautés v6.7.4 — Équipements Pro

- véritable **parc matériel** pour Gérant et Responsable ;
- fiches machines avec marque, modèle, série, emplacement, photo, garantie et criticité ;
- état **Opérationnel / Maintenance / Hors service** ;
- suivi de la dernière température et des seuils ;
- maintenance périodique et échéances ;
- signalement de panne avec photo/PDF, coût et intervenant ;
- création optionnelle d'une non-conformité depuis une panne ;
- remise en service avec historique de réparation ;
- archivage conservant l'historique au lieu d'une suppression destructive ;
- QR code ouvrant directement la fiche équipement ;
- fiche PDF imprimable ;
- alertes matériel et maintenance sur le dashboard ;
- correction du bug des équipements sans seuil traités comme du matériel froid ;
- cache PWA versionné en v6.7.4.

Les tableaux de bord pro v6.7.2, les Paramètres v6.7.1 et les renforcements production v6.7.0 sont conservés.

Voir `MODIFICATIONS-v6.7.4.md` et `START-HERE-v6.7.4.md`.

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

La version actuelle préremplit les informations publiques confirmées de LIVRICI SOLUTIONS SAS : capital 2 €, SIREN/SIRET, RCS/RNE, TVA, APE 62.01Z et siège. Les coordonnées actuelles de Railway sont préconfigurées comme hébergeur.

Avant ouverture commerciale, renseignez/validez impérativement :

- une adresse e-mail de contact réellement consultée ;
- un numéro de téléphone réellement joignable ;
- le contact RGPD ;
- le directeur de publication correspondant au représentant légal actuel.


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

Le Scanner Pro recherche désormais automatiquement un EAN/GTIN dans cet ordre : **catalogue de l’établissement → produits déjà validés → cache HygieSafe → Open Food Facts → UPCitemdb**. Si un produit est trouvé, son nom, sa marque, sa catégorie, son conditionnement, son image et les informations disponibles sont proposés avant validation.

Après validation par un utilisateur, la fiche est mémorisée pour l’établissement afin que les prochains scans soient instantanés et ne dépendent pas d’un appel Internet. Un produit inconnu peut être nommé manuellement une seule fois puis mémorisé.

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


## v6.6.0 — Scanner automatique & Journées guidées

- Scanner automatique : produit/code-barres, étiquette DLC/DDM, facture, bon de livraison, document ou photo justificative sans choix préalable.
- Confirmation manuelle uniquement lorsque la confiance de détection est insuffisante.
- Journées Employé planifiées par le Gérant/Responsable : étapes ordonnées, temps prévu, quantité cible, consignes et photo modèle.
- Écran Employé centré sur une seule étape, avec progression vert → orange → rouge et passage automatique à l’étape suivante.
- Preuves photo par étape et historique complet consultable par le Gérant/Responsable.
- Sauvegarde ZIP enrichie avec programmes de journée, événements et preuves.
- Permissions terrain, suppression de médias et file hors ligne durcies.
- Données externes de catalogue mieux séparées des fiches validées par l’établissement.
- Le site parle désormais de « sauvegarde complète exportable (ZIP) » au lieu de promettre une sauvegarde serveur automatique.


## v6.7.0 — Production, journées équipe, tutoriel et accueil

- le Gérant/Responsable peut modifier une journée individuellement avant démarrage et modifier ses étapes futures pendant son exécution ;
- les étapes déjà actives ou terminées sont verrouillées ;
- quantité réellement réalisée, signalement « J’ai un problème », motif/note/photo et historique ;
- preuves HACCP renforcées : horodatage Employé côté serveur, contrôles anciens/recyclés refusés, révisions et annulation tracée ;
- médias déjà utilisés comme preuves non supprimables ;
- permissions Employé resserrées sur historiques et fournisseurs ;
- reset mot de passe limité par IP et par adresse hachée ;
- CGV + CGU + DPA versionnés à l’inscription, politique de confidentialité portée à connaissance ;
- mentions légales, DPA, sous-traitants et checklist France 2026 consolidés ;
- migration `029_v670_production_reliability.sql`.

Le **tutoriel de première connexion v3** et la **refonte de l’accueil** sont inclus dans cette version. Le tutoriel adapte le parcours au rôle et l’accueil présente les Journées guidées, le Scanner intelligent et les Preuves HACCP.


## Documents de mise en production v6.7.0

- `MODIFICATIONS-v6.7.0.md` : changements livrés ;
- `PRODUCTION-CHECKLIST-v6.7.0.md` : actions à valider avant ouverture ;
- `REGLEMENTATION-FRANCE-2026.md` : cadrage juridique/opérationnel ;
- `ANALYSE-FINALE-v6.7.0.md` : état de préparation ;
- `PACKAGE-LOCK-ACTION-REQUIRED.md` : action requise avant build reproductible.
