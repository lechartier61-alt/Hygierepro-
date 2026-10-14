# HygieSafe v6.5.4 — Scanner intelligent

- Nouveau choix Caméra / Galerie, avec scanner code-barres en direct quand disponible.
- Aperçu de la photo avant analyse et score de qualité local.
- Alerte flou, lumière, reflet et résolution avant envoi OCR.
- Copie optimisée en niveaux de gris/contraste pour OCR, sans remplacer l’original conservé comme justificatif.
- Détection code-barres locale en complément de Tesseract.
- Correction du fallback code-barres sur navigateurs sans BarcodeDetector : plus de mode serveur invalide `barcode`.
- Confiance par champ et surlignage des informations à vérifier.
- Proposition des différentes dates trouvées sur l’étiquette.
- Validation du produit/date avant enregistrement de traçabilité.
- Factures : lignes peu fiables mises en évidence.
- OCR relancé plus tôt lorsque produit/date/lot ou lignes de facture manquent.
- Reconnaissance enrichie : D.L.C, D.D.M, BBE, USE-BY, EXPIRY, lots `L:`, températures avec `/`, DDM fin de mois.
- Interface scanner responsive améliorée.
