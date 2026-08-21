# HygieSafe v6.4.8 — Centre de supervision Admin

## Objectif
Donner à l’administrateur une vision beaucoup plus complète de l’activité HygieSafe sans exposer les mots de passe, clés API ou secrets techniques.

## Nouveau dashboard
- entreprises totales, actives, suspendues, essais, abonnés et comptes à surveiller ;
- nouveaux clients sur 1 / 7 / 30 jours ;
- utilisateurs, rôles, vérification e-mail, connexions 24 h et activité temps réel ;
- MRR, CA encaissé et CA du mois ;
- volumes HACCP, températures, réceptions, traçabilité et non-conformités ;
- stockage et nombre de fichiers ;
- fournisseurs, commandes et factures importées ;
- incidents et indicateurs de sécurité ;
- versions HygieSafe utilisées.

## Entreprises
Le bouton « Voir tout » ouvre une fiche complète : identité, adresse, abonnement, activité, stockage, utilisateurs, types d’enregistrements, paiements récents, commandes fournisseurs, factures, horaires employés et journal d’activité.

## Nouvelles pages Admin
- Utilisateurs ;
- Abonnements & chiffre d’affaires ;
- Utilisation de HygieSafe ;
- État du système ;
- Incidents améliorés ;
- Journal d’activité enrichi.

## État technique
Affiche uniquement des informations sûres : version, Node.js, uptime, mémoire, taille PostgreSQL, statut du stockage, Resend/SMTP, Stripe, chiffrement 2FA, cookies sécurisés et URLs publiques. Les valeurs secrètes ne sont jamais retournées.

## Migration
`020_app_version_648_admin_observability.sql`
