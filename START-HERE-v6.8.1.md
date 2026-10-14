# HygieSafe v6.8.1 — Auth Hotfix

1. Déployer ce projet à la place de la v6.8.0.
2. Exécuter les migrations habituelles (`npm run migrate`). Aucune nouvelle migration après 034.
3. Vérifier `/health` : version `6.8.1`.
4. Sur le téléphone, fermer/réouvrir l'onglet HygieSafe. Si nécessaire, actualiser une fois la page pour laisser le nouveau Service Worker prendre le contrôle.
5. Tester : Connexion, Mot de passe oublié, déconnexion/reconnexion, puis accès à `/app.html`.

Le correctif vise le message `Session de sécurité expirée. Rechargez la page.` qui pouvait apparaître sur un formulaire public lorsqu'un ancien cookie de session était encore présent.
