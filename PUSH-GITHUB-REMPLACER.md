# Push GitHub — remplacer le dépôt LGY

Le ZIP contient maintenant :

- `push-github-remplacer.sh` : script principal pour Git Bash ;
- `push-github-remplacer.bat` : lanceur Windows.

Dépôt configuré :

`https://github.com/lechartier61-alt/LGY.git`

## Utilisation avec Git Bash

1. Extraire complètement le ZIP.
2. Ouvrir le dossier extrait.
3. Clic droit → **Open Git Bash here**.
4. Lancer :

```bash
./push-github-remplacer.sh
```

5. Pour confirmer le remplacement, taper exactement :

```text
OUI
```

Le script utilise `--force-with-lease`, ce qui est plus sûr qu'un `--force` simple :
si le dépôt distant change après la récupération, Git bloque l'écrasement au lieu de perdre ces modifications.
