# HygiePro v6.0 — modifications majeures

## Architecture

- passage d'une application locale à une base SaaS full-stack ;
- PostgreSQL multi-entreprise ;
- API serveur ;
- stockage privé des médias ;
- synchronisation multi-appareils ;
- PWA conservée pour l'ergonomie mobile et le hors-ligne temporaire.

## Connexion

- suppression complète du PIN ;
- suppression complète du code entreprise ;
- e-mail + mot de passe personnel pour chaque utilisateur ;
- invitations salariés par lien/QR ;
- rôles gérant, responsable et employé.

## Onboarding

- essai 14 jours automatique ;
- sans carte bancaire ;
- assistant en 5 étapes ;
- configuration établissement, équipements, contrôles et équipe.

## UX

- accueil public raccourci ;
- écran principal « Aujourd'hui » ;
- bouton Scanner mis en avant ;
- fonctions principales : Aujourd'hui, Contrôles, Scanner, Traçabilité, Menu ;
- modules avancés conservés dans Menu.

## Scanner

- DLC/DDM par photo ;
- lot ;
- facture ;
- code-barres ;
- validation humaine avant enregistrement.

## Abonnement

- 7,99 €/mois/entreprise ;
- Stripe Checkout ;
- portail client ;
- webhooks ;
- codes promo ;
- gestion des impayés ;
- blocage serveur après essai expiré sans abonnement valide.

## Administration

- surface Admin séparée ;
- 2FA TOTP obligatoire ;
- entreprises, utilisateurs, MRR, revenus, stockage, activité, versions ;
- essais, impayés, incidents ;
- suspension/réactivation/suppression ;
- codes promo ;
- contenu de l'accueil ;
- paramètres juridiques ;
- journal Admin.

## Sécurité

- Argon2id ;
- sessions serveur ;
- cookies HttpOnly ;
- CSRF ;
- rate limiting ;
- CSP ;
- séparation stricte des entreprises ;
- médias privés.
