# HygieSafe v6.4.0 — nouveau nom et identité

- Marque publique renommée de HygiePro vers **HygieSafe**.
- Nouveau wordmark SVG `logo-hygiesafe.svg`, conservant le bouclier H + coche et remplaçant « Pro » par « Safe ».
- Nom mis à jour sur accueil, authentification, application, admin, PWA, rapports PDF, exports, sauvegardes ZIP et e-mails.
- Le logo compact de navigation utilise le bouclier seul pour rester lisible sur mobile.
- Cache PWA renouvelé (`hygiesafe-v6.4.0-shell`).
- Les identifiants techniques historiques (cookie, file d'attente IndexedDB, fonction SQL, anciennes migrations et clés d'idempotence Stripe) sont volontairement conservés lorsque les renommer pourrait casser une session, une donnée hors ligne ou une migration existante.
- Migration `012_app_version_640.sql`.

- En-tête du tableau de bord mobile compacté : Profil et Déconnexion deviennent des actions icône sur petit écran, avec labels accessibles.
- Test de parcours utilisateur statique ajouté : `npm run test:user` (19/19).
