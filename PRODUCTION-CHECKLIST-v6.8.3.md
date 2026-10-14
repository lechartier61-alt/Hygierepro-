# Checklist production — HygieSafe v6.8.3

## Railway / base
- [ ] PostgreSQL actif dans le même environnement Railway.
- [ ] `DATABASE_URL` référence le service PostgreSQL Railway.
- [ ] migration `035_scanner_dlc_product_link_v682.sql` déjà appliquée.
- [ ] `/health` retourne `version: 6.8.3`.

## Installation PWA
- [ ] `https://hygiesafe.com/manifest.webmanifest` répond correctement.
- [ ] `https://hygiesafe.com/sw.js` répond correctement.
- [ ] Android Chrome : bouton Installer fonctionnel.
- [ ] Windows Chrome / Edge : bouton Installer fonctionnel.
- [ ] iPhone/iPad Safari : instructions Ajouter à l'écran d'accueil correctes.
- [ ] l'application installée s'ouvre en mode autonome.
- [ ] l'icône 192x192 est correcte.
- [ ] l'icône 512x512 est correcte.
- [ ] Paramètres détecte correctement une application déjà installée.

## Inscription
- [ ] notification PWA visible sur la page d'inscription.
- [ ] inscription continue normalement si l'utilisateur ignore la notification.
- [ ] création de compte mémorise le rappel d'installation.
- [ ] rappel après onboarding non bloquant.
- [ ] bouton Plus tard ferme le rappel.

## Régression Scanner DLC
- [ ] clic Scanner ouvre directement la caméra.
- [ ] DLC liée à un produit.
- [ ] création produit depuis scanner.
- [ ] raccourcis produits connus.
- [ ] apprentissage code-barres / OCR.
- [ ] mode série, réception et facture conservés.

## Production
- [ ] Stripe testé en mode test puis live.
- [ ] Resend réel testé.
- [ ] sauvegarde ZIP téléchargée et restauration vérifiée.
- [ ] stockage persistant configuré.
- [ ] `package-lock.json` généré et versionné dès qu'un environnement npm complet est disponible.
