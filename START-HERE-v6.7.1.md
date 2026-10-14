# START HERE — HygieSafe v6.7.1

Cette version ajoute un accueil public compact à onglets et un espace **Paramètres** personnel pour chaque utilisateur.

## Déploiement depuis v6.7.0

```bash
npm install
npm run migrate
npm run test:v671
npm start
```

Sur Railway, le `npm run migrate` doit exécuter la migration `030_user_settings_v671.sql` avant le démarrage.

## Après déploiement

1. Ouvrir l'accueil public et vérifier les onglets **Aperçu / Journées / Scanner / HACCP / Équipe / Tarif**.
2. Se connecter avec un Gérant, un Responsable et un Employé.
3. Ouvrir **Mon profil → Paramètres**.
4. Vérifier le mode **Interface concise** (activé par défaut).
5. Tester **Relancer maintenant** et **Relancer à la prochaine connexion** pour le tutoriel.
6. Tester le choix de l'écran d'ouverture.
7. Vérifier l'affichage mobile.

## Important

Les réglages personnels sont stockés dans `users.ui_preferences`. Ils ne modifient pas les paramètres HACCP de l'établissement.
