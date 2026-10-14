# HygieSafe — Refonte UX2 : parcours métier + formulaires

**Livraison : 14 octobre 2026**  
**Base fonctionnelle : HygieSafe 6.8.4**, dérivée de la refonte UX1. Il s'agit d'une **évolution de l'ergonomie**, **pas d'une nouvelle version 6.8.5 du moteur HACCP**.

## Ce qui a réellement été modifié

1. **Accueil orienté actions** : « Qu’avez-vous à faire maintenant ? » avec accès directs (contrôle, scanner DLC, réception, signalement), et quatre autres actions derrière « Voir les autres actions ». Les boutons lancent la page ou le formulaire d'origine. Pas de faux écran de saisie ni de stockage supplémentaire.
2. **Parcours rapides sur l’ensemble des écrans existants** : 34 pages métier + 10 pages admin. Les étapes sont des liens et boutons effectifs, affichés uniquement si le rôle et l'interface le permettent. Exemples : réception → scanner → stocks ; production → recettes → étiquettes ; contrôle → anomalie → suivi ; fournisseur → besoins → configuration → historique ; administration → incidents → système → journal.
3. **Formulaires et modales** : intitulés liés aux champs pour les lecteurs d’écran, rappel « renseigner → vérifier → enregistrer », décompte des champs HTML obligatoires, avertissement de modifications non enregistrées et confirmation avant fermeture volontaire (sans sauvegarder de données en local), focus clavier sur ordinateur et navigation Tab contenue dans la fenêtre modale.
4. **Saisies métier importantes** : champs indispensables côté client pour certains formulaires génériques (produit reçu, produit tracé, anomalie, tâche, huile, article de stock, nuisible, allergène), acceptation des nombres décimaux et conservation de la valeur préremplie `0`.
5. **Température** : lecture claire des seuils configurés pour le frigo/congélateur sélectionné et avertissement visuel si la température saisie semble hors seuil. **Il ne s'agit pas d'une validation HACCP supplémentaire** : l'enregistrement et les actions correctives restent assurés par le code serveur et la logique d'origine.
6. **Recherche des listes** : bouton pour effacer les recherches sans sélectionner manuellement le texte (en déclenchant les filtres natifs).
7. **Mobile** : grille compacte de quatre actions prioritaires, autres actions repliables, parcours rapides adaptés au tactile, et styles de focus accessibles.

**Aucune migration SQL ni modification des routes métier** : droits, organisations, Stripe, Resend, OCR et traçabilité sont conservés.

## Fichiers principaux

- `public/js/workflows.js` : catalogue d'actions, navigation par parcours, assistance aux formulaires.
- `public/css/workflows.css` : composants et responsive.
- `public/js/app.js` : aperçu température, saisie décimale et champs requis dans le formulaire de fiche générique.
- `public/app.html` et `public/admin.html` : chargement du nouveau module UX2.
- `public/sw.js` : cache PWA `hygiesafe-v6.8.4-shell-ux2` pour éviter d'afficher un mélange d'anciens et de nouveaux fichiers.
- `scripts/test-ux2-workflows.js` et `npm run test:ux2` : régression statique des 44 écrans et fonctions UX2.

## Installation et recette avant mise en ligne

1. Décompresser le ZIP dans un environnement de test **sans écraser immédiatement la production**.
2. Installer les dépendances dans un environnement Node.js 20+ : `npm install`. Le `package-lock.json` n'était pas fourni dans la base : versionner celui généré, puis utiliser `npm ci` aux prochains déploiements.
3. Lancer : `npm run check`, `npm run test:ux`, `npm run test:ux2`, `npm run test:v684`, puis `npm test`.
4. Tester sur un environnement de préproduction avec PostgreSQL, stockage persistant, Stripe test, e-mails de test et HTTPS. Vérifier avec **Gérant / Responsable / Employé / Administrateur 2FA** les parcours, refus d'accès, saisies réelles, sauvegardes et restitutions PDF.
5. Vérifier l'installation PWA existante : fermeture/réouverture après activation du nouveau service worker. Contrôler si nécessaire le chargement du nouveau cache.
6. Sauvegarder la base et le stockage avant tout déploiement sur le service utilisé par les clients.

## Résultats observés dans l'environnement de préparation

- `npm run check` : **réussi**.
- `npm run test:ux` : **réussi** (socle UX1 : 34 + 10 pages).
- `npm run test:ux2` : **réussi** (44 parcours, liens de chargement, formulaires, version PWA).
- `npm run test:v684` : **22/22 réussis** (scanner et preuves DLC).
- `npm run test:v683` : **22/22 réussis** (PWA).
- `npm run test:v672`, `test:v673`, `test:v674`, `test:v675` : **réussis**.
- `npm test` : progression sans erreur jusqu'à **`test:backup`**, puis arrêt à cause de **`ERR_MODULE_NOT_FOUND: archiver`** (dépendances npm absentes). Ce n'est **pas un test d'intégration réussi**.
- Tests navigateur Chromium sur maquette HTML **avec modules métier simulés** : bureau 1440 px, mobile 375 px, administration 1280 px. Les boutons métier et la fermeture protégée d'un formulaire ont répondu ; la navigation des 34 pages et des 10 pages admin n'a produit aucune erreur JavaScript ou débordement horizontal dans cette maquette. **Ce n'est pas une preuve de fonctionnement des routes, de la base ni des intégrations.**

### Limites volontaires

Les « étapes » sont des **raccourcis de navigation**, pas des tâches validées automatiquement. Les données HACCP ne sont pas modifiées ou générées par l'assistance UX, et la conformité de l'établissement n'est pas certifiée par l'application. Les contrôles réels, la fiabilité des permissions, les opérations Stripe, les exports et les sauvegardes doivent encore être validés sur infrastructure connectée.
