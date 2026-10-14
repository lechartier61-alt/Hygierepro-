# HygieSafe v6.3.1 — Facture → tableau de commandes

- Le gérant peut scanner une facture fournisseur depuis Scanner ou depuis Commandes fournisseurs.
- OCR enrichi : fournisseur, numéro/date de facture, totaux et lignes produits.
- Écran de vérification obligatoire avant import : produit, référence, quantité précédente, unité et prix.
- Une facture validée crée automatiquement les articles manquants et leur association fournisseur.
- Le tableau Commandes est immédiatement partagé avec les employés.
- Les employés renseignent seulement la quantité réellement à commander et peuvent prévenir le gérant.
- La quantité de la facture sert de quantité habituelle/conseillée, sans imposer la prochaine commande.
- Historique technique des imports de factures avec média source, lignes et audit.
- Protection contre l’import accidentel deux fois de la même facture pour un même fournisseur.
- Migration PostgreSQL `007_invoice_order_lists.sql`.
