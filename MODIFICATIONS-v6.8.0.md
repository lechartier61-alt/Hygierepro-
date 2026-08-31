# HygieSafe v6.8.0 — Pilotage HACCP intelligent

## Objectif

La v6.8.0 fait évoluer HygieSafe d'un outil de suivi HACCP vers un outil de pilotage quotidien : les données terrain alimentent un centre de priorités, des actions correctives, la production, la traçabilité et le suivi multisite.

## Nouveautés principales

### Centre « À traiter » et HygieSafe Score
- score opérationnel calculé à partir des températures, de la traçabilité, des opérations, des équipements et de la qualité ;
- score affiché « À initialiser » tant qu'il n'y a pas assez de données ;
- le score est explicitement présenté comme un indicateur interne, jamais comme une certification HACCP ;
- priorités consolidées : non-conformités, températures, DLC, pannes, maintenance, blocages d'employés, capteurs et actions correctives.

### Actions correctives guidées
- actions ouvertes / en cours / résolues / classées ;
- gravité, échéance, responsable et consigne ;
- affectation validée dans l'établissement actif ;
- une action critique doit être résolue et ne peut pas simplement être masquée.

### Recettes, productions et lots
- fiches recettes avec ingrédients, allergènes, rendement et instructions ;
- création de lots de production HygieSafe ;
- rattachement des lots/sources ingrédients utilisés ;
- états actif, consommé, retiré ou jeté ;
- recherche de rappel par numéro de lot ;
- horodatage officiel serveur pour les créations terrain Employé.

### DLC secondaires et étiquettes
- règles Ouverture / Préparation / Décongélation / Production ;
- durée configurable ;
- génération d'étiquette et PDF ;
- rattachement possible à un relevé ou à un lot de production.

### Capteurs connectés
- capteurs liés à l'établissement et éventuellement à un équipement ;
- clé d'ingestion secrète hachée en base ;
- mesures idempotentes ;
- heure appareil + heure de réception serveur ;
- bornage des horodatages aberrants ;
- création automatique du relevé de température ;
- ouverture d'une non-conformité et d'une action corrective hors seuil ;
- résolution historisée lors du retour à la normale ;
- historique des mesures et réglages Gérant/Responsable.

### Notifications
- notifications internes par utilisateur et établissement ;
- déduplication ;
- alertes sur panne, blocage Employé, capteur critique et affectation d'action ;
- notification navigateur/PWA lorsque l'application est active/synchronisée.

### Multisite
- réseau d'établissements ;
- rôle distinct par établissement ;
- établissement actif stocké dans la session ;
- changement de site sans modifier le compte global ;
- accès/révocation par établissement ;
- protection du dernier Gérant ;
- facturation centralisée sur l'établissement principal ;
- quantité d'abonnement basée sur le nombre de sites actifs ;
- suppressions et archivages réseau sécurisés.

### Analyses, rapports et sauvegardes
- analyses de pilotage ;
- rapport PDF de pilotage ;
- sauvegarde enrichie avec recettes, lots, productions, actions correctives, règles DLC, étiquettes, capteurs sans secret, mesures, notifications et réseau.

### Tutoriel
- tutoriel v4 adapté aux rôles Gérant, Responsable et Employé ;
- présentation des nouvelles fonctions selon le périmètre de chaque rôle.

## Sécurité / corrections v6.8.0
- droits multisite déterminés par les memberships actifs ;
- données réseau réduites pour les rôles non propriétaires ;
- révocation d'un site sans désactiver le compte global ;
- sessions d'un site révoqué invalidées uniquement pour ce site ;
- statistiques Admin recalculées via les memberships ;
- création de compte démo Admin avec réseau et membership ;
- suppression d'un réseau multisite bloquée ;
- suppression d'un réseau mono-site gère proprement les contraintes PostgreSQL ;
- journées guidées valident le rôle de l'Employé sur l'établissement actif ;
- horaires et retours isolés par établissement.

## Migration

```text
034_pilotage_intelligent_v680.sql
```

Exécuter `npm run migrate` avant le démarrage de l'application.
