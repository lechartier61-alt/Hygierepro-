# Action requise — package-lock.json — HygieSafe v6.8.2

L'archive source initiale ne contenait pas de `package-lock.json`. Une tentative de génération pendant la préparation de la v6.8.2 a expiré lors de l'accès au registre npm. Aucun lockfile incomplet ou inventé n'est livré.

Avant la mise en production définitive, sur une machine connectée au registre npm :

```bash
npm install
npm run check
npm run test:v682
npm test
git add package-lock.json
git commit -m "chore: lock dependencies for HygieSafe v6.8.2"
```

Ensuite utiliser de préférence :

```bash
npm ci
```

pour les builds CI/Railway reproductibles.
