# HygieSafe v6.5.5 — Scanner Pro

## Nouveautés
- Scan en série avec session persistante et reprise après rechargement.
- Réception intelligente liée automatiquement à la dernière commande fournisseur et à la dernière facture importée.
- Lecture GS1 / DataMatrix quand le navigateur prend en charge `BarcodeDetector`, avec extraction GTIN, lot, DLC/DDM, date de production, quantité et poids GS1.
- Détection des doublons dans la traçabilité, les réceptions et les sessions scanner des 30 derniers jours.
- Détection automatique des DLC dépassées/proches, lots absents, produits inconnus, produits non commandés et sur-réceptions.
- Comparaison finale Commandé ↔ Reçu ↔ Facturé avec écarts détaillés.
- Création automatique d'une non-conformité pour les écarts sérieux de réception.
- Possibilité de voir et supprimer un scan avant de terminer la session.
- Les sessions Scanner Pro sont incluses dans la sauvegarde complète ZIP.

## Base de données
Migration `026_scanner_pro_sessions.sql` : tables `scan_sessions` et `scan_session_items`, version applicative 6.5.5.

## Sécurité / validation
- Toutes les sessions sont cloisonnées par entreprise et utilisateur authentifié.
- Les médias liés au scan sont validés comme appartenant à l'entreprise.
- Limites de taille/quantité et validation Zod sur les données reçues.
