# HygieSafe v6.4.2 — correction inscription

## Correction principale

- Correction de l'erreur PostgreSQL `42P08` (`uuid versus text`) pendant la création d'un compte.
- La requête d'audit utilisait le même paramètre SQL pour `organization_id` (UUID) et `entity_id` (texte).
- `entity_id` utilise désormais un paramètre distinct et `String(org.id)`.

## Logs

- Les réponses attendues 4xx (par exemple `401 auth_required`) ne sont plus imprimées comme des stacks d'erreur complètes.
- Les vraies erreurs serveur 5xx restent journalisées intégralement et créent toujours un incident.

## Tests

- Ajout de `npm run test:registration` pour empêcher le retour de cette régression SQL.
- Version applicative et cache PWA passés en 6.4.2.
