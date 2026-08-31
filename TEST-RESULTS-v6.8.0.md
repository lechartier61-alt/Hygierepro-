# Résultats de validation — HygieSafe v6.8.0

Date de validation : 26 août 2026.

## Vérifications exécutées dans l'environnement de préparation

- vérification syntaxique JavaScript : **84 fichiers / 84 valides** ;
- suites statiques et de cohérence exécutables sans dépendances externes : **24/24 au vert** ;
- contrôle spécifique v6.8.0 Pilotage intelligent : **153/153**.

Suites validées :

- check global ;
- Admin bootstrap, observabilité et UX/prix ;
- facture → commandes ;
- recherche produits ;
- Railway / Resend (contrôles statiques) ;
- inscription ;
- tutoriels par rôle ;
- Scanner, Scanner UX et Scanner Pro ;
- températures programmées ;
- sécurité ;
- parcours utilisateur ;
- v6.6.0 Journées guidées / Scanner auto ;
- v6.7.0 Production ;
- v6.7.1 Paramètres / Accueil ;
- v6.7.2 Dashboards Pro ;
- v6.7.3 Interface Pro ;
- v6.7.4 Équipements Pro ;
- v6.7.5 Accueil Premium ;
- comptes / rôles ;
- v6.8.0 Pilotage intelligent.

## Tests à rejouer après installation des dépendances

Deux tests runtime ne sont pas déclarés réussis dans l'environnement de préparation parce que `node_modules` n'est pas disponible :

- `scripts/test-backup.js` (dépend notamment de `archiver`) ;
- `scripts/test-professional-emails.js` (templates/e-mails et dépendances runtime).

Après `npm install`, exécuter la suite complète `npm test` et ces tests explicitement.

## Tests de production recommandés après déploiement Railway

- migrations réelles sur PostgreSQL ;
- inscription + vérification e-mail ;
- Gérant / Responsable / Employé / Admin en navigateur réel ;
- changement d'établissement multisite dans deux sessions simultanées ;
- Stripe Checkout + webhook en mode test ;
- création puis restauration d'une sauvegarde ZIP ;
- ingestion d'un capteur de test ;
- parcours lot → production → rappel ;
- notifications navigateur/PWA ;
- tests mobile réel et PWA installée.
