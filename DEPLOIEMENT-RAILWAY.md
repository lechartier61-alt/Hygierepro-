# Déploiement Railway — HygieSafe v6.8.2

## Prérequis
- Node.js 22 ;
- PostgreSQL 16 ;
- stockage persistant privé (S3 compatible ou Railway Volume) ;
- `package-lock.json` généré/versionné avant production définitive, puis builds avec `npm ci`.

## PostgreSQL
Dans le service HygieSafe, `DATABASE_URL` doit être une **variable de référence** vers le service PostgreSQL Railway, et non une URL saisie manuellement avec un hostname arbitraire.

Le démarrage doit exécuter :

```bash
npm run migrate
```

La dernière migration v6.8.2 est :

```text
035_scanner_dlc_product_link_v682.sql
```

## Variables principales

```text
NODE_ENV=production
DATABASE_URL=<référence Railway PostgreSQL>
APP_URL=https://www.hygiesafe.com
PUBLIC_SITE_URL=https://www.hygiesafe.com
SESSION_COOKIE_SECURE=true
FIELD_ENCRYPTION_KEY=<clé stable 32+ caractères>
```

Stockage : configurer S3 ou un volume Railway avec `UPLOAD_DIR=/data/uploads`.

## Resend

```text
RESEND_API_KEY=re_...
RESEND_FROM=HygieSafe <noreply@votre-domaine>
```

Tester vérification e-mail, invitation et reset.

## Stripe

Si activé :

```text
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_AUTOMATIC_TAX=true
STRIPE_PRICE_TAX_BEHAVIOR=exclusive
STRIPE_COLLECT_TAX_ID=true
```

La v6.8.2 conserve la facturation sur l'établissement principal du réseau et synchronise la quantité d'abonnement avec le nombre de sites actifs. Tester impérativement ce scénario en mode Stripe test avant le live.

## Juridique
Compléter et valider :

```text
LEGAL_EMAIL=
LEGAL_PHONE=
LEGAL_PRIVACY_EMAIL=
LEGAL_PUBLISHER=
```

## Validation
Après déploiement :

- `/health` → `ok: true`, `version: 6.8.2` ;
- dernière migration 035 appliquée ;
- Gérant / Responsable / Employé / Admin testés ;
- Score / À traiter ;
- production / lots / rappel ;
- DLC secondaire / PDF ;
- capteur test ;
- multisite + changement de site + révocation ;
- Stripe test ;
- e-mails ;
- sauvegarde téléchargée **et restaurée dans un environnement de test**.

Voir `START-HERE-v6.8.2.md`, `PRODUCTION-CHECKLIST-v6.8.2.md` et `TEST-RESULTS-v6.8.2.md`.
