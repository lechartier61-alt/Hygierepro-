# Résultats de tests — HygieSafe v6.7.4

## Équipements Pro

`node scripts/test-v674-equipment-pro.js` → **30/30 OK**

Le contrôle couvre notamment la route dédiée, la migration 033, l'archivage, les pannes, réparations, maintenances, non-conformités, seuils de température, dashboard, QR, PDF, médias, sauvegarde et responsive.

## Régressions exécutées

- v6.7.3 Interface Pro : **30/30**
- v6.7.2 Dashboards Pro : **20/20**
- v6.7.1 Paramètres & accueil : **18/18**
- v6.7.x Production : **29/29**
- v6.6.0 Scanner/Journées : **26/26**
- Parcours utilisateur : **24/24**
- Sécurité : **OK**
- Horaires/températures : **6/6**
- Scanner UX : **13/13**
- Scanner Pro : **17/17**
- Produits : **15/15**
- Tutoriels : **12/12**
- Admin observabilité : **20/20**
- Admin UX/prix : **10/10**
- Admin bootstrap : **8/8**
- Inscription SQL, Railway/Resend et Facture→commandes : **OK**

## Limite de l'environnement de test

Le test runtime de génération ZIP (`scripts/test-backup.js`) ne peut pas être exécuté ici car les dépendances npm ne sont pas installées et `archiver` n'est pas disponible localement. Le service de sauvegarde passe la vérification de syntaxe et les contrôles statiques ; le test runtime doit être rejoué après `npm install`/`npm ci`.
