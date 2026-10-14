# Résultats de tests — HygieSafe v6.8.1

## Correctif authentification

- 12/12 contrôles spécifiques v6.8.1 : OK
- les routes Login, Inscription, Mot de passe oublié, Reset, Vérification e-mail par jeton, Invitation et Login Admin ne dépendent plus du CSRF d'une session déjà présente ;
- les écritures privées authentifiées continuent d'exiger le CSRF.

## Régressions rejouées

- sécurité : 10/10 ;
- comptes / rôles : 38/38 ;
- pilotage intelligent v6.8.x : 153/153 ;
- parcours utilisateur : 24/24 ;
- inscription SQL : OK ;
- Railway / Resend : 8/8 ;
- vérification syntaxique / structure : OK.

## Base de données

Aucune migration v6.8.1. La migration la plus récente reste `034_pilotage_intelligent_v680.sql`.
