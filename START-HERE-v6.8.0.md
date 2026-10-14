# START HERE — HygieSafe v6.8.0

## 1. Avant le déploiement

Sur une machine connectée au registre npm :

```bash
npm install
npm run check
npm run test:v680
npm test
```

Conserver ensuite le `package-lock.json` généré dans Git et utiliser `npm ci` pour les builds reproductibles.

## 2. Railway

Vérifier au minimum :

- `DATABASE_URL` relié au service PostgreSQL ;
- `NODE_ENV=production` ;
- `APP_URL` / `PUBLIC_SITE_URL` ;
- `SESSION_COOKIE_SECURE=true` ;
- `FIELD_ENCRYPTION_KEY` stable ;
- stockage persistant (S3 ou Railway Volume) ;
- Resend si les e-mails sont activés ;
- Stripe + Automatic Tax si la facturation est activée ;
- informations `LEGAL_*` complètes avant commercialisation.

## 3. Migration

Le déploiement doit exécuter :

```bash
npm run migrate
```

et appliquer jusqu'à :

```text
034_pilotage_intelligent_v680.sql
```

## 4. Vérification post-déploiement

- `/health` retourne `ok: true` et `version: 6.8.0` ;
- création/connexion Gérant ;
- création Responsable et Employé ;
- Centre À traiter et Score ;
- production + lot + rappel ;
- DLC secondaire + PDF ;
- capteur test ;
- création d'un second site et changement de site ;
- sauvegarde ZIP ;
- rapport de pilotage PDF ;
- e-mails de vérification/invitation/reset ;
- Stripe test si activé.

## 5. Important

Le Score HygieSafe est un indicateur interne de pilotage. Il ne constitue pas une certification HACCP et ne transfère pas la responsabilité réglementaire de l'exploitant.
