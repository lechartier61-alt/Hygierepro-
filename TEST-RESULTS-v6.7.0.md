# HygieSafe v6.7.0 — Résultats de tests de préparation

Date : 24 août 2026.

## Passés
- Vérification syntaxe de tous les fichiers JavaScript `src`, `public/js`, `scripts` : OK.
- `scripts/check.js` : OK.
- v6.7.0 production candidate : **29/29**.
- v6.6.0 Scanner auto + Journées guidées : **26/26**.
- sécurité : **10/10**.
- parcours utilisateur : **24/24**.
- tutoriels & UX rôles : **12/12**.
- scanner UX : **13/13**.
- Scanner Pro : **17/17**.
- Base Produits Internet : **15/15**.
- horaires + températures : **6/6**.
- admin observabilité : **20/20**.
- admin UX & prix : **10/10**.
- admin bootstrap : **8/8**.
- inscription SQL : OK.
- Railway / Resend : **8/8**.
- facture → commandes : **3/3**.

## À rejouer dans un environnement connecté
`node scripts/test-backup.js` ne peut pas être exécuté dans l'environnement de préparation car le module npm `archiver` n'est pas installé. La tentative `npm install --package-lock-only` a expiré sur l'accès au registre npm, et aucun `package-lock.json` partiel n'a été conservé.

Avant production :

```bash
npm install
npm run check
npm run test:v670
npm test
```

Puis versionner le `package-lock.json` et utiliser `npm ci` pour les builds suivants.

Il faut également exécuter les tests d'intégration nécessitant PostgreSQL et réaliser un vrai test de restauration de sauvegarde.
