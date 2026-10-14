# HygieSafe — Refonte ergonomique complète (socle v6.8.4)

**Version de livraison : v6.8.4 · UX Refondue 1** — 14 octobre 2026.

## Ce qui change

La refonte réorganise la prise en main **sur les 34 écrans de l'espace métier et les 10 écrans du centre d'administration**. Chaque écran dispose maintenant d'un objectif court lié à l'action réelle, d'un mode d'emploi contextualisé en trois étapes et de liens vers les rubriques qui vont ensemble.

L'interface a été harmonisée : en-têtes, fil d'Ariane, fonds, contrastes, typographies, panneaux, boutons, formulaires, tableaux, états, espaces vides, modales et écrans mobiles. La navigation et les écrans de connexion utilisent les mêmes conventions graphiques, sur ordinateur, tablette et téléphone.

**Fonctions de navigation nouvelles** :

- **Ctrl+K** (ou Cmd+K) : recherche des pages par nom *ou besoin réel* (ex. température, DLC, nettoyage, facture, frigo).
- `/` : placer le curseur dans la recherche latérale, ou ouvrir la recherche générale sur petit écran.
- **★** : épingler vos rubriques préférées sur cet appareil.
- **Comment procéder ?** : ouvrir trois étapes métier et des liens utiles pour chaque écran.
- **↗** : action prioritaire proposée lorsque l'action existante est plus loin dans l'écran.
- Contexte de navigation « Espace / Domaine / Fonction », état courant accessible et navigation au clavier.

La recherche reste **filtrée par rôle**. Elle ne constitue pas une autorisation de sécurité : le contrôle serveur existant reste prioritaire.

## Ce qui ne change pas

Les routes/API, la base PostgreSQL, les permissions métier, les flux Stripe, l'intégration Resend, les calculs de DLC, le scanner OCR et les justificatifs sont conservés. Aucune migration supplémentaire n'est nécessaire pour cette livraison UX. La numérotation serveur reste **6.8.4** intentionnellement : il ne s'agit pas d'une v6.8.5 métier testée.

Le traitement des données HACCP, la réglementation et la conformité d'un établissement ne sont **pas** modifiés ou certifiés par une refonte d'interface.

## Installation / déploiement

1. Décompresser l'archive ZIP et ouvrir le dossier qui contient `package.json`.
2. Dans un environnement Node.js **20+** disposant de npm, exécuter `npm install`. Générer et versionner `package-lock.json` avant un déploiement reproductible.
3. Lancer `npm run check`, `npm run test:ux` puis `npm test` avec les dépendances installées.
4. Tester dans un environnement de préproduction relié à un PostgreSQL dédié, stockage persistant, URLs HTTPS, Resend de test et Stripe mode test.
5. Déployer le code complet et attendre l'activation du nouveau cache PWA `hygiesafe-v6.8.4-shell-ux1`. Vérifier les réouvertures depuis les applications installées.
6. Vérifier au minimum les comptes Gérant, Responsable, Employé et Administrateur (2FA), la navigation mobile, le scanner, les preuves, les sauvegardes, les exports et les accès interdits.

**Important :** ne pas écraser le service de production sans sauvegarde de la base et validation de préproduction. Réutiliser les variables d'environnement de la précédente version, ne jamais placer leurs valeurs dans l'archive.

## Tests réalisés pour cette livraison

- `npm run check` : **réussi**.
- `npm run test:v684` : **22/22 réussis**.
- `npm run test:v683` : **22/22 réussis**.
- `npm run test:v675` : **30/30 et 38/38 réussis**.
- `npm run test:v673` : **30/30 réussis**.
- `npm run test:ux` : **réussi**.
- Vérification DOM navigateur avec Chromium sur **34 pages métier et 10 pages admin** : guide contextuel présent, 3 étapes, absence d'erreur JS ; recherche par « température » fonctionnelle.
- Vérification responsive avec Chromium sur les largeurs **375, 600, 720, 799, 820, 880, 920, 1024 et 1440 px** : navigation présente et pas de débordement horizontal dans les pages testées.
- `npm test` complet : **non achevé dans l'environnement de préparation**, la dépendance `archiver` n'étant pas installée. Une tentative de génération du verrou npm a expiré, donc les validations d'intégration (base, e-mails, paiements, sauvegardes) restent à faire sur un environnement connecté.

Ce pack est un **candidat de refonte ergonomique** nécessitant recette fonctionnelle avant mise en production. La qualité graphique a été vérifiée sur une maquette statique, pas avec un vrai compte connecté à des données réelles.

## Fichiers principaux de la refonte

- `public/css/experience.css` : système visuel unifié et responsive, adapté aux pages de connexion et de gestion.
- `public/js/experience.js` : assistance et navigation contextuelles par écran, palette de commandes et favoris.
- `public/app.html`, `public/admin.html` et les pages publiques : chargement de la nouvelle couche.
- `public/sw.js` : invalidation de l'ancien cache et intégration des nouveaux fichiers.
- `scripts/test-experience-ux.js` et commande `npm run test:ux` : couverture de chaque page.

Les fichiers d'origine ont été **conservés** : cette mise à niveau est réversible et n'impose pas de réécrire la logique serveur ou le schéma SQL.
