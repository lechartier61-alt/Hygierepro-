#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/lechartier61-alt/LGY.git"
BRANCH="main"
COMMIT_MESSAGE="Remplacement complet du site LGY"

echo "=============================================="
echo " LGY.fr - Remplacer le contenu sur GitHub"
echo " Depot : $REPO_URL"
echo " Branche : $BRANCH"
echo "=============================================="
echo
echo "ATTENTION : ce script remplace la branche GitHub '$BRANCH'"
echo "par le contenu du dossier dans lequel il est lancé."
echo

read -r -p "Continuer ? Tapez OUI : " CONFIRM
if [[ "$CONFIRM" != "OUI" ]]; then
  echo "Annulé."
  exit 0
fi

# Toujours travailler depuis le dossier du script.
cd "$(dirname "$0")"

# Vérifie que Git est disponible.
if ! command -v git >/dev/null 2>&1; then
  echo "Erreur : Git n'est pas installé ou n'est pas disponible dans Git Bash."
  exit 1
fi

# Initialise le dépôt local si le ZIP a été extrait dans un dossier neuf.
if [[ ! -d ".git" ]]; then
  git init
fi

# Vérifie l'identité Git.
if ! git config user.name >/dev/null 2>&1; then
  read -r -p "Nom Git à utiliser : " GIT_NAME
  git config user.name "$GIT_NAME"
fi

if ! git config user.email >/dev/null 2>&1; then
  read -r -p "E-mail Git à utiliser : " GIT_EMAIL
  git config user.email "$GIT_EMAIL"
fi

# Configure l'adresse du dépôt LGY.
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

echo
echo "Récupération de l'état actuel de GitHub..."
git fetch origin "$BRANCH" || true

# Crée/repositionne la branche locale main sur le contenu actuel du dossier.
git checkout -B "$BRANCH"

echo
echo "Préparation de tous les fichiers..."
git add -A

if git diff --cached --quiet; then
  echo "Aucun changement à envoyer."
else
  git commit -m "$COMMIT_MESSAGE"
fi

echo
echo "Envoi vers GitHub..."
echo "Le push utilise --force-with-lease pour éviter d'écraser"
echo "une modification distante arrivée après la récupération."
git push -u origin "$BRANCH" --force-with-lease

echo
echo "=============================================="
echo " Terminé : GitHub a été mis à jour."
echo " $REPO_URL"
echo "=============================================="
