#!/usr/bin/env bash
set -euo pipefail
REMOTE="https://github.com/lechartier61-alt/Hygierepro-.git"
if [ ! -d .git ]; then git init; fi
git branch -M main
git remote remove origin >/dev/null 2>&1 || true
git remote add origin "$REMOTE"
git add .
git commit -m "HygieSafe v6.3.5 compte test client" || true
git push -u origin main
