# START HERE — HygieSafe v6.7.5

## Déploiement

1. Remplacer le code par la v6.7.5.
2. Vérifier les variables Railway existantes.
3. Lancer les migrations habituelles (`npm run migrate`). Il n'y a pas de nouvelle migration SQL spécifique à l'accueil v6.7.5.
4. Vérifier que l'application affiche `6.7.5`.
5. Vérifier que le Service Worker utilise `hygiesafe-v6.7.5-shell`.
6. Sur un téléphone ayant déjà HygieSafe, fermer puis rouvrir l'application/PWA afin que le nouveau Service Worker prenne le contrôle.

## Tests recommandés après déploiement

Créer ou utiliser quatre comptes de test :

- Gérant ;
- Responsable ;
- Employé ;
- Admin HygieSafe.

Suivre `AUDIT-COMPTES-v6.7.5.md` et `TEST-RESULTS-v6.7.5.md`.

## Point restant

Générer `package-lock.json` avec un accès npm valide :

```bash
npm install
```

Puis versionner le lockfile et utiliser `npm ci`.
