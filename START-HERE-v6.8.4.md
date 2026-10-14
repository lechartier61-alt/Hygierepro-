# START HERE — HygieSafe v6.8.4

1. Déployer le contenu de cette archive sur Railway.
2. Vérifier que `DATABASE_URL` référence le vrai service PostgreSQL Railway.
3. Railway exécute `npm run migrate`. Aucune nouvelle migration v6.8.4 : la dernière reste `035_scanner_dlc_product_link_v682.sql`.
4. Vérifier `/health` : `ok: true` et `version: 6.8.4`.
5. Sur téléphone HTTPS, ouvrir Scanner : la caméra doit s'ouvrir directement.
6. Tester une étiquette avec DLC + lot sur la même zone : 1 photo.
7. Tester une étiquette avec DLC et lot séparés : ajouter Photo 2, puis enregistrer.
8. Vérifier qu'aucune 3e photo ne peut être ajoutée.
9. Tester l'installation PWA depuis Paramètres sur téléphone ou PC.

Avant production, utiliser Stripe en mode test et vérifier les webhooks.
