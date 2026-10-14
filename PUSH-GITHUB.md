# Push GitHub

Dépôt configuré dans les scripts :

```text
https://github.com/lechartier61-alt/Hygierepro-.git
```

## Push normal

Dans Git Bash ouvert dans ce dossier :

```bash
bash push-github.sh
```

## Remplacer complètement la branche main

À utiliser uniquement si l'ancien dépôt doit être remplacé par cette v6.3.2 :

```bash
bash push-github-remplacer.sh
```

Le second script effectue un `push --force` sur `main`. Vérifier auparavant que le dépôt ne contient rien à conserver.

Aucun secret `.env` n'est inclus dans le push.
