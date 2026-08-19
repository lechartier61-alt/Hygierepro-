#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/lechartier61-alt/LGY.git"
BRANCH="main"

echo "=== Publication de LGY.fr sur GitHub ==="

if ! command -v git >/dev/null 2>&1; then
  echo "Erreur : Git n'est pas installé ou n'est pas accessible dans Git Bash."
  exit 1
fi

if [[ ! -f package.json || ! -f server.js ]]; then
  echo "Erreur : lancez ce script depuis le dossier racine du projet LGY-fr-MVP."
  exit 1
fi

if [[ -f .env ]]; then
  echo "Sécurité : le fichier .env existe mais il est ignoré par Git."
fi

if [[ ! -d .git ]]; then
  git init
fi

git branch -M "$BRANCH"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

# Identité Git : Git demandera de la configurer si elle manque.
if ! git config user.name >/dev/null 2>&1 || ! git config user.email >/dev/null 2>&1; then
  echo
  echo "Votre identité Git n'est pas encore configurée."
  read -r -p "Nom à afficher dans les commits : " GIT_NAME
  read -r -p "Adresse e-mail GitHub : " GIT_EMAIL
  git config --global user.name "$GIT_NAME"
  git config --global user.email "$GIT_EMAIL"
fi

git add .

if git diff --cached --quiet; then
  echo "Aucun nouveau changement à enregistrer."
else
  read -r -p "Message du commit [Initialisation LGY.fr V5] : " COMMIT_MESSAGE
  COMMIT_MESSAGE=${COMMIT_MESSAGE:-"Initialisation LGY.fr V5"}
  git commit -m "$COMMIT_MESSAGE"
fi

echo
echo "Envoi vers $REPO_URL..."
git push -u origin "$BRANCH"

echo
echo "Terminé : le projet a été publié sur GitHub."
