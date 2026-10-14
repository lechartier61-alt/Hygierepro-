# HygieSafe v6.8.4 — Scanner DLC : preuve en 1 ou 2 photos

## Objectif

Simplifier le scan DLC : la photo n'a plus vocation à montrer tout l'emballage. Elle doit cadrer la zone où figurent la date limite et le numéro de lot.

## Nouveau parcours

1. Clic sur **Scanner** → caméra ouverte directement.
2. Photo 1 : cadrer la zone **DLC + lot**.
3. HygieSafe analyse la date et le lot.
4. Si les deux informations sont séparées sur l'emballage, l'utilisateur peut ajouter **une seule Photo 2**.
5. La deuxième photo est analysée et les résultats sont fusionnés avec la première.
6. La DLC reste obligatoirement liée à un produit HygieSafe.
7. Enregistrement avec 1 ou 2 photos de preuve maximum.

## Produit

La logique v6.8.2 reste active :
- produit reconnu automatiquement quand possible ;
- raccourcis vers les produits existants/récents ;
- création rapide d'un produit sans quitter le scanner ;
- mémorisation des associations OCR / code-barres → produit.

## Preuves

Le record de traçabilité conserve :
- `scanMediaId` : première photo pour compatibilité ;
- `scanMediaIds` : tableau des preuves, maximum 2 ;
- `evidencePhotoCount` : 1 ou 2 ;
- `evidenceScope=dlc_lot_zone`.

Le serveur vérifie que toutes les photos appartiennent au même établissement et sont bien de type `scan_traceability`.

## Base de données

Aucune migration SQL supplémentaire. La dernière migration reste :
`035_scanner_dlc_product_link_v682.sql`.

## PWA

Toutes les fonctions v6.8.3 sont conservées : installation téléphone / tablette / PC depuis Paramètres et proposition d'installation après inscription.
