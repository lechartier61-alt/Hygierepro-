# Installation Boulangerie Démo depuis un téléphone

1. Déployer ce projet sur Railway (avec sa base PostgreSQL existante, après sauvegarde).
2. Vérifier que les migrations habituelles du projet ont été appliquées.
3. Sur téléphone, ouvrir https://www.hygiesafe.com/admin.html et se connecter comme administrateur avec la double authentification.
4. Ouvrir « Entreprises » puis « Installer Boulangerie Démo ».
5. Confirmer l’installation. Copier et conserver immédiatement le mot de passe généré.
6. Ouvrir /login.html et utiliser l’adresse test-boulangerie@hygiesafe.test et le mot de passe affiché.

L’opération est transactionnelle et refuse un second import. Les 528 températures et 1 777 DLC sont des simulations et ne sont pas des mesures ou lots réellement constatés. Aucune donnée n’est installée automatiquement au déploiement. Ne pas exposer les accès administrateur.

IMPORTANT : le ZIP n’a pas été testé contre votre base Railway réelle ; effectuer une sauvegarde et tester dans un environnement de préproduction si possible.
