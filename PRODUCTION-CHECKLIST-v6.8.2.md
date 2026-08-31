# Checklist production — HygieSafe v6.8.2

## Base / Railway
- [ ] PostgreSQL actif dans le même environnement Railway.
- [ ] `DATABASE_URL` est une référence Railway valide vers le service PostgreSQL.
- [ ] migration `035_scanner_dlc_product_link_v682.sql` appliquée.
- [ ] `/health` retourne `version: 6.8.2`.

## Scanner DLC
- [ ] clic Scanner ouvre la caméra.
- [ ] import photo fonctionne.
- [ ] DLC détectée et modifiable.
- [ ] produit reconnu si déjà connu.
- [ ] produits récents proposés si non reconnu.
- [ ] recherche produit fonctionne.
- [ ] création rapide produit fonctionne avec compte Employé.
- [ ] DLC refusée côté serveur sans produit valide.
- [ ] photo de preuve consultable.
- [ ] second scan apprend l'association.
- [ ] mode série fonctionne.
- [ ] réception fonctionne.
- [ ] facture fonctionne pour les rôles autorisés.

## Comptes
- [ ] Gérant.
- [ ] Responsable.
- [ ] Employé.
- [ ] Admin + 2FA.

## Intégrations
- [ ] Resend réel.
- [ ] Stripe en mode test puis live.
- [ ] stockage S3 ou Railway Volume persistant.
- [ ] sauvegarde ZIP téléchargée et testée.

## Build reproductible
- [ ] `package-lock.json` généré avec `npm install` et versionné.
- [ ] builds suivants avec `npm ci`.
