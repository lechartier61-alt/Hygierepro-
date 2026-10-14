# HygiePro v6.1 — Scanner Terrain

Cette version améliore le scanner à partir de véritables étiquettes de produits de restauration : charcuterie, surgelés, fromage, pains/pinsa et viandes.

## Lecture des étiquettes
- OCR français + anglais.
- rotation automatique de la photo pendant l'OCR.
- seconde lecture automatique en mode texte épars si la première lecture manque une date ou un lot.
- sérialisation des analyses OCR pour éviter deux lectures simultanées sur le même worker.

## Dates reconnues
Le moteur distingue maintenant :
- DLC — « à consommer jusqu'au » / `use by` ;
- DDM — « à consommer de préférence avant » / `best before` ;
- date limite générique — « à consommer avant » ;
- date de production / `production date` ;
- date de surgélation / `frozen on` ;
- date de décongélation.

Formats supportés notamment :
- `28/08/26` ;
- `19.06.2028` ;
- `20.06 2026` ;
- `22 09 26` ;
- `2028-06-19` ;
- dates avec mois écrits en français ou en anglais.

## Autres champs
- numéro de lot / lot number / batch ;
- poids net en g ou kg ;
- température de conservation ;
- code-barres EAN/GTIN avec contrôle de la clé ;
- proposition du nom de produit lorsque le texte est suffisamment fiable.

## Sécurité contre les mauvaises détections
- une date de production n'est plus utilisée comme DLC ;
- une date de surgélation n'est plus utilisée comme date limite ;
- les faux codes-barres provenant d'une date sont filtrés ;
- les dates isolées très anciennes sont ignorées comme date limite probable ;
- une donnée incertaine est laissée vide plutôt que d'inventer une valeur.

## Interface
Après une photo, l'utilisateur voit d'abord seulement :
- produit ;
- date limite ;
- type de date ;
- lot ;
- code-barres.

Les informations secondaires sont repliées : poids, conservation, date de production et date de surgélation.

Les actions restent simples :
- Enregistrer en traçabilité ;
- Réception ;
- Stock ;
- Reprendre la photo.

## Photo d'origine
La photo de l'étiquette est conservée avec l'enregistrement lorsque l'utilisateur valide une fiche créée depuis le scanner.
