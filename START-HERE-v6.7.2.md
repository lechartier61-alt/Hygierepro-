# START HERE — HygieSafe v6.7.2

Cette version refait les tableaux de bord connectés de tous les rôles.

## Déploiement depuis v6.7.1

```bash
npm install
npm run migrate
npm run test:v672
npm start
```

La migration `031_dashboard_pro_v672.sql` met à jour la version applicative des établissements.

## Vérification après déploiement

1. Se connecter avec un **Gérant** : vérifier état global, priorités et service du jour.
2. Se connecter avec un **Responsable** : vérifier journées équipe, retards et blocages.
3. Se connecter avec un **Employé** : vérifier progression personnelle et étape en cours.
4. Ouvrir `/admin.html` : vérifier la nouvelle vue **Centre de pilotage**.
5. Tester sur mobile : KPI en grille, panneaux empilés, actions rapides compactes.
6. Vérifier le mode **Interface concise** dans Paramètres.

## Important

Le dashboard Employé ne présente plus les compteurs globaux de toute l'entreprise pour les non-conformités, DLC et températures : les données sensibles restent limitées à son propre périmètre.
