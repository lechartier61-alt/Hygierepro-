# Checklist production — HygieSafe v6.8.0

## Bloquants avant mise en ligne commerciale

- [ ] générer et versionner un vrai `package-lock.json` ;
- [ ] exécuter `npm test` avec toutes les dépendances installées ;
- [ ] tester les migrations sur une copie PostgreSQL de production ;
- [ ] tester une sauvegarde **et sa restauration** ;
- [ ] renseigner/valider `LEGAL_EMAIL`, `LEGAL_PHONE`, `LEGAL_PRIVACY_EMAIL`, `LEGAL_PUBLISHER` ;
- [ ] vérifier le domaine Resend et tous les e-mails transactionnels ;
- [ ] tester Stripe en mode test, webhook, TVA et quantité multisite ;
- [ ] activer TOTP 2FA sur l'Admin ;
- [ ] vérifier le stockage persistant des médias.

## Parcours comptes

- [ ] Gérant : dashboard, À traiter, Score, équipes, équipements, recettes, production, capteurs, réseau, analyses ;
- [ ] Responsable : supervision sans accès propriétaire/facturation ;
- [ ] Employé : Ma journée, contrôles, scanner, production autorisée, aucune donnée sensible hors périmètre ;
- [ ] Admin : 2FA, organisations, memberships multisite, compte démo, suppression sécurisée.

## Multisite

- [ ] créer un second établissement ;
- [ ] attribuer des rôles différents sur deux sites ;
- [ ] ouvrir deux sessions et changer de site indépendamment ;
- [ ] révoquer un accès et vérifier que le compte reste actif ailleurs ;
- [ ] vérifier qu'il est impossible de retirer le dernier Gérant ;
- [ ] vérifier la quantité Stripe selon les sites actifs ;
- [ ] tester archivage/réactivation ;
- [ ] tester suppression d'un réseau mono-site et blocage d'un réseau multi-site.

## Pilotage intelligent

- [ ] Score « À initialiser » sur établissement sans données ;
- [ ] Score et priorités à partir de données réelles ;
- [ ] action corrective critique non masquable ;
- [ ] panne équipement → priorité/notification ;
- [ ] Employé bloqué → priorité/notification ;
- [ ] capteur hors seuil → relevé + NC + action ;
- [ ] capteur revenu normal → résolution historisée ;
- [ ] lot de production et recherche de rappel ;
- [ ] règle DLC secondaire et étiquette PDF ;
- [ ] rapport Pilotage PDF.

## Après lancement

- [ ] suivi erreurs/logs Railway ;
- [ ] test hebdomadaire de restauration de sauvegarde en environnement isolé ;
- [ ] revue mensuelle des accès multisite ;
- [ ] revue des sous-traitants RGPD ;
- [ ] surveillance des performances Scanner/OCR et capteurs.
