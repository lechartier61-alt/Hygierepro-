# HygiePro v6.2.1 - Commandes fournisseurs

## Côté employé
- nouvelle page **Commandes fournisseurs** ;
- tableau avec tous les produits ;
- fournisseur affiché sur chaque produit ;
- stock actuel, stock minimum et quantité conseillée ;
- saisie simple de la quantité à commander ;
- bouton **Prévenir le gérant** ;
- export PDF et CSV de la fiche de besoins.

Les employés peuvent préparer les besoins tous les jours. Ils ne peuvent ni modifier un fournisseur, ni changer ses jours de commande, ni valider une commande fournisseur.

## Côté gérant
- création et modification des fournisseurs ;
- jours de commande configurables (lundi à dimanche) ;
- heure limite facultative ;
- délai de livraison ;
- minimum de commande ;
- coordonnées et numéro de compte fournisseur ;
- association d'un fournisseur unique à chaque produit ;
- unité/conditionnement, quantité habituelle, référence et prix estimé ;
- PDF de préparation par fournisseur ;
- validation de commande uniquement un jour autorisé ;
- historique des commandes ;
- bon de commande PDF et export CSV.

## Logo HygiePro
Le logo HygiePro est présent :
- dans la page Commandes fournisseurs ;
- dans les formulaires de configuration ;
- sur la fiche PDF de besoins ;
- sur le PDF de préparation gérant ;
- sur le bon de commande final.

Les PDF affichent aussi le nom de l'établissement, l'utilisateur ayant généré le document et la date.

## Sécurité métier
La règle des jours de commande est contrôlée côté serveur. Modifier l'interface du navigateur ne permet donc pas de valider une commande un jour interdit.
