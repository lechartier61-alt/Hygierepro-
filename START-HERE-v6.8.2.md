# START HERE — HygieSafe v6.8.2

## Déploiement Railway

1. Déployer **tout le contenu** de cette archive.
2. Vérifier que le service PostgreSQL est dans le **même projet et le même environnement Railway** que HygieSafe.
3. Dans le service HygieSafe, `DATABASE_URL` doit être une **Reference Variable** vers PostgreSQL.

Si le service base de données s'appelle `Postgres`, dans le champ **valeur** de `DATABASE_URL`, utiliser :

`${{Postgres.DATABASE_URL}}`

Ne pas écrire `DATABASE_URL=` dans le champ valeur et ne pas fabriquer une URL avec `@base:5432`.

4. Railway exécute `npm run migrate` via `preDeployCommand`.
5. Vérifier que la migration suivante est appliquée :

`035_scanner_dlc_product_link_v682.sql`

6. Vérifier `/health` :

- `ok: true`
- `service: HygieSafe`
- `version: 6.8.2`

## Smoke test Scanner

Avec un compte Gérant puis Employé :

1. cliquer sur **Scanner** → la caméra doit s'ouvrir directement ;
2. photographier une étiquette avec DLC ;
3. si le produit n'existe pas, cliquer **Créer ce produit** ;
4. enregistrer la DLC ;
5. rescanner la même référence : HygieSafe doit reconnaître ou proposer le produit en raccourci ;
6. vérifier la DLC dans **Traçabilité / Produits & DLC**.

## Avant production définitive

L'archive source ne contient pas de `package-lock.json`. Dans un environnement ayant accès à npm :

```bash
npm install
npm run check
npm run test:v682
npm test
```

Versionner ensuite le `package-lock.json` et utiliser `npm ci` pour les builds futurs.
