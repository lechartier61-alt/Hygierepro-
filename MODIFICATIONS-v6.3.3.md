# HygieSafe v6.3.3 — Compte test client

- Ajout dans **Admin > Entreprises** d’un bouton **+ Compte test client**.
- Création d’un établissement de démonstration avec gérant `owner` et e-mail déjà vérifié.
- Mot de passe fort généré aléatoirement et retourné une seule fois à l’administrateur.
- Essai de 30 jours pour permettre les tests fonctionnels.
- Aucune donnée sensible ou mot de passe n’est stocké en clair.
- Création journalisée dans le journal d’audit administrateur.
- Réponse de création marquée `Cache-Control: no-store`.
- Migration `009_app_version_633.sql` pour harmoniser la version des espaces.
