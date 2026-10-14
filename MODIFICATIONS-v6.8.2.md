# HygieSafe v6.8.2 — Scanner DLC simplifié

## Objectif
Le bouton **Scanner** sert désormais en priorité à enregistrer les DLC le plus vite possible :

**Scanner → caméra → produit → DLC → enregistrer**.

## Nouveautés
- clic sur **Scanner** : ouverture directe de la caméra arrière ;
- import d'une photo toujours disponible ;
- analyse automatique immédiate si la qualité de la photo est suffisante ;
- une DLC doit obligatoirement être liée à un produit HygieSafe ;
- reconnaissance par code-barres, nom exact ou association apprise ;
- si le produit n'est pas reconnu : raccourcis vers les produits récents/similaires ;
- recherche dans les produits déjà créés ;
- création rapide d'un produit sans quitter le scanner ;
- mémorisation du code-barres et du libellé OCR corrigé pour les scans suivants ;
- lot facultatif, quantité modifiable ;
- photo du scan conservée comme preuve de traçabilité ;
- protection contre un double enregistrement involontaire dans les 2 minutes ;
- après validation : **Scanner la DLC suivante** ou **Voir mes DLC**.

## Compatibilité
Les usages avancés ne sont pas supprimés :
- mode série ;
- réception intelligente ;
- facture fournisseur ;
- EAN / GTIN / GS1 / DataMatrix.

Ils sont simplement moins visibles afin de ne pas encombrer le parcours DLC quotidien.

## Base de données
Nouvelle migration :

`035_scanner_dlc_product_link_v682.sql`

Elle ajoute `product_scan_aliases`, la mémoire locale des associations entre une lecture OCR et un produit du catalogue.

## Sauvegardes
Les associations apprises du scanner sont incluses dans `donnees-completes/liaisons-scanner-produits.json`.
