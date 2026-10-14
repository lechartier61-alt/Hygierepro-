# HygieSafe v6.3.0 — modifications

- Audit sécurité et fiabilité complet.
- Vérification e-mail obligatoire avant fonctions métier.
- Durcissement réinitialisation mot de passe.
- Rate limiting auth partagé PostgreSQL.
- Contrôle Origin / Sec-Fetch-Site / Referer renforcé.
- 2FA admin chiffrée et protection anti-rejeu.
- Uploads contrôlés par signature binaire ; SVG refusé.
- Stockage persistant S3 ou Railway Volume obligatoire en production.
- Stripe : webhooks idempotents, verrou Checkout, réservations atomiques promo, Checkout 30 min.
- Suppression entreprise sécurisée vis-à-vis de Stripe et du stockage.
- Validation UUID/Zod élargie.
- Protection CSV contre les formules.
- Exports HACCP restreints aux rôles gérant/responsable.
- Rétention et nettoyage renforcés.
- PWA : cache privé/sensible exclu.
- Connexion/inscription améliorées et plus accessibles.
- Politique de confidentialité, CGV et mentions légales enrichies.
- Version globale 6.3.0.
