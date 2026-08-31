# HygieSafe v6.6.0 — Scanner automatique & Journées guidées

## Scanner automatique

Le Scanner intelligent devient l’entrée principale : l’utilisateur prend une photo ou choisit une image sans sélectionner auparavant « produit / facture / étiquette ».

HygieSafe analyse puis classe automatiquement le contenu en :
- facture fournisseur ;
- bon de livraison ;
- étiquette produit / DLC / DDM ;
- produit / code-barres EAN, GTIN, GS1 ou DataMatrix ;
- document ;
- photo justificative.

Le niveau de confiance est affiché. Une confirmation est demandée seulement lorsque la classification est incertaine. Les modes forcés restent disponibles dans « Choisir manuellement le type » pour les cas difficiles.

## Journées guidées Employé

Le Gérant ou le Responsable peut créer un programme daté pour un Employé avec jusqu’à 100 étapes :
- titre et catégorie ;
- consignes ;
- temps prévu ;
- quantité cible et unité ;
- photo modèle / référence ;
- preuve photo obligatoire ou facultative.

L’Employé dispose d’un écran « Ma journée » centré sur une seule étape. Il commence la journée puis avance étape par étape. La suivante démarre automatiquement lorsqu’il clique sur « J’ai terminé cette étape ».

La progression temporelle est volontairement non chronométrique :
- vert : temps confortable ;
- orange : fin du temps prévu proche ;
- rouge : temps prévu dépassé.

Les étapes HACCP peuvent ouvrir directement Températures, Nettoyage, Scanner, Traçabilité ou Réception. Les preuves photo doivent appartenir à l’Employé et avoir été téléversées après le démarrage de l’étape lorsqu’elles sont envoyées par un compte Employé.

Le Gérant/Responsable peut consulter la journée complète : avancement, retards, consignes, photo modèle, preuve employé, note de fin et horodatages.

## Durcissement production

- Les modifications terrain d’un Employé sont limitées à ses propres saisies récentes et à des types autorisés.
- Un Employé ne peut plus supprimer librement des médias déjà utilisés comme preuve.
- La file hors connexion est liée au couple utilisateur + entreprise afin d’éviter une synchronisation sous un autre compte sur un appareil partagé.
- Les données détaillées issues d’Open Food Facts / UPCitemdb sont séparées des fiches mémorisées et validées par l’établissement ; la migration nettoie les anciennes mémoires externes.
- `.env.example` utilise `www.hygiesafe.com` et `mail.hygiesafe.com`.
- La promesse « sauvegarde serveur automatique » a été remplacée par « sauvegarde complète exportable (ZIP) ».
- Les CGV précisent désormais le taux contractuel des pénalités de retard (taux BCE de refinancement le plus récent + 10 points) et l’indemnité forfaitaire de 40 €.

## Sauvegarde

La sauvegarde ZIP comprend désormais :
- les journées employé ;
- les étapes ;
- les événements de journée ;
- les photos modèles ;
- les preuves photo employé ;
- un dossier chronologique par journée et par employé.

## Base de données

Nouvelle migration : `028_guided_workdays_auto_scanner.sql`.

Nouvelles tables :
- `workday_plans` ;
- `workday_steps` ;
- `workday_events`.

Version application : `6.6.0`.
