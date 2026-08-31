# HygieSafe v6.8.1 — Correctif authentification / CSRF

## Correctif principal

Les routes publiques de connexion, inscription et récupération de compte n'exigent plus le jeton CSRF d'une éventuelle session déjà présente dans le navigateur.

Le bug v6.8.0 pouvait afficher `Session de sécurité expirée. Rechargez la page.` sur :
- Connexion ;
- Mot de passe oublié ;
- Inscription ;
- connexion Admin ;
si un cookie de session valide était déjà présent mais que le formulaire public n'envoyait pas son jeton CSRF.

Les actions privées authentifiées restent protégées par le middleware CSRF. Les formulaires publics restent protégés par le contrôle Same-Origin et le rate limiting.

## PWA

Cache PWA incrémenté en `hygiesafe-v6.8.1-shell` afin d'éviter qu'un téléphone conserve les ressources v6.8.0 après déploiement.

## Base de données

Aucune migration supplémentaire : la migration la plus récente reste `034_pilotage_intelligent_v680.sql`.
