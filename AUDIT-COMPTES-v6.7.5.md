# Audit comptes & produit — HygieSafe v6.7.5

## Note globale

**8,7 / 10 — très bonne production candidate, encore à valider en E2E réel avant lancement large.**

## Notes par compte

### Gérant — 9,1 / 10

Points forts :
- dashboard de pilotage ;
- journées équipe ;
- fournisseurs et commandes ;
- équipements ;
- rapports, sauvegardes, abonnement ;
- droits sensibles bien isolés du Responsable et de l'Employé.

À améliorer :
- vue calendrier/semaine encore plus forte pour planifier plusieurs salariés ;
- centre de notifications unifié ;
- indicateurs coûts/maintenance/achats ;
- personnalisation des modules visibles pour chaque établissement.

### Responsable — 8,9 / 10

Points forts :
- supervision des contrôles et journées ;
- accès aux équipements ;
- horaires équipe ;
- rapports et journal ;
- pas d'accès à la facturation ni aux actions propriétaire sensibles.

À améliorer :
- file "à traiter maintenant" dédiée aux blocages et anomalies ;
- délégation fine de permissions au lieu d'un rôle Responsable unique ;
- notifications de service.

### Employé — 8,7 / 10

Points forts :
- journée guidée claire ;
- données globales réduites ;
- horodatage serveur ;
- preuves verrouillées ;
- navigation mobile raccourcie ;
- scanner adapté au terrain.

À améliorer :
- rendre Ma journée réellement robuste hors connexion ;
- permettre au Gérant de choisir quels modules Employé sont visibles ;
- mode "une seule action à la fois" facultatif pour les équipes qui veulent une interface ultra-simple ;
- meilleure gestion des notifications de changement de programme.

### Admin HygieSafe — 8,8 / 10

Points forts :
- session admin séparée ;
- 2FA obligatoire avant accès aux données ;
- suppression d'entreprise avec mot de passe + confirmation ;
- prévention de facturation Stripe orpheline ;
- audit et incidents ;
- création de compte démo avec mot de passe aléatoire.

À améliorer :
- exiger `FIELD_ENCRYPTION_KEY` au démarrage en production au lieu d'attendre l'utilisation du 2FA ;
- alertes automatiques sur incidents critiques ;
- journal d'audit critique "fail closed" pour certaines actions destructrices.

## Priorités avant montée en charge

### P1 — à faire avant lancement large

1. Générer et versionner `package-lock.json`.
2. Créer des tests E2E Playwright avec PostgreSQL réel pour Gérant, Responsable, Employé et Admin.
3. Rejouer le test de sauvegarde ZIP et surtout un **test de restauration**.
4. Rejouer les e-mails réels avec Resend en environnement test.
5. Tester Stripe Checkout / Tax / Webhook avec un vrai compte test.
6. Renforcer l'audit des actions critiques : le service `audit()` journalise actuellement l'erreur puis laisse l'action continuer si l'insertion de log échoue.

### P2 — qualité produit / exploitation

7. Rendre les journées guidées compatibles hors ligne de bout en bout.
8. Ajouter des notifications internes/push pour blocage Employé, panne équipement, maintenance et contrôle dépassé.
9. Ajouter une configuration des modules visibles par rôle et par établissement.
10. Séparer progressivement `public/js/app.js` en modules et charger les fonctions lourdes à la demande.
11. Rendre la taille du pool PostgreSQL configurable et faire un test de charge avant scale horizontal.
12. Faire un audit accessibilité WCAG complet (clavier, lecteur d'écran, contrastes, focus, formulaires).

### P3 — différenciation premium

13. Ajouter empreinte SHA-256 / manifeste d'intégrité aux exports de preuves.
14. Ajouter statistiques coût de maintenance et coût par équipement.
15. Ajouter modèles de journées par semaine/saison et vue planning multi-employés.
16. Ajouter un centre "À traiter" unique pour le Gérant/Responsable.

## Point corrigé en v6.7.5

Le rendu d'accueil visible sur la capture pouvait provenir d'un cache PWA incohérent : nouvel HTML + ancienne CSS. La v6.7.5 utilise une CSS dédiée et une stratégie réseau prioritaire pour le code, ce qui supprime ce risque lors des futures mises à jour.
