# START HERE — HygieSafe v6.7.4

1. Déployer le contenu de l'archive sur Railway.
2. Vérifier `DATABASE_URL` vers PostgreSQL.
3. Exécuter `npm run migrate`.
4. Vérifier que `033_equipment_pro_v674.sql` est appliquée.
5. Se connecter avec un compte **Gérant** ou **Responsable**.
6. Ouvrir **Équipements** et tester : création, modification, panne, maintenance, remise en service, archivage.
7. Vérifier qu'un équipement hors service disparaît des équipements proposés dans les relevés de température.
8. Tester un matériel sans seuil de température (ex. friteuse) : il ne doit pas être proposé comme équipement froid.
9. Ouvrir le QR d'un équipement et vérifier qu'il ramène sur sa fiche.
10. Ouvrir la **Fiche PDF**.
11. Tester sur mobile et ordinateur.
12. Vérifier que le cache PWA utilisé est `hygiesafe-v6.7.4-shell`.

Important : le projet source ne contient toujours pas de `package-lock.json` fiable. Dès qu'un poste avec accès au registre npm est disponible, exécuter `npm install`, versionner le lockfile, puis utiliser `npm ci` pour les déploiements suivants.
