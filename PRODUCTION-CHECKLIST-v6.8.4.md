# Checklist production — HygieSafe v6.8.4

- [ ] `/health` retourne `version: 6.8.4`.
- [ ] PostgreSQL Railway est joignable via `DATABASE_URL`.
- [ ] Scanner ouvre directement la caméra sur mobile.
- [ ] Photo 1 demande de cadrer DLC + lot.
- [ ] Une DLC avec date + lot sur une seule photo s'enregistre correctement.
- [ ] Photo 2 peut compléter une date ou un lot manquant.
- [ ] Impossible d'ajouter plus de 2 photos.
- [ ] Les 1 ou 2 photos sont conservées comme preuves dans le record.
- [ ] Produit existant proposé si la reconnaissance automatique échoue.
- [ ] Création rapide produit fonctionne depuis le scanner.
- [ ] Nouveau scan du même produit réutilise la mémoire de reconnaissance.
- [ ] Installation PWA fonctionne depuis Paramètres.
- [ ] Notification d'installation après inscription reste non bloquante.
- [ ] Stripe testé en mode test avant passage live.
- [ ] Sauvegarde/restauration testée sur un environnement non production.
