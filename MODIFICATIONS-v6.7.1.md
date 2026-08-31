# HygieSafe v6.7.1 — Paramètres utilisateur & accueil compact

## Interface connectée
- ajout d’un onglet **Paramètres** à côté de **Mon profil** ;
- Paramètres également accessible depuis le menu principal ;
- préférences personnelles persistées en PostgreSQL (`users.ui_preferences`) ;
- **Interface concise** activée par défaut : masque les explications secondaires sans masquer les alertes, preuves ou données métier ;
- option d’affichage des fonctions avancées par défaut ;
- choix de l’écran d’ouverture ;
- option texte plus grand ;
- option réduction des animations ;
- réinitialisation des préférences.

## Tutoriel
- bouton **Relancer maintenant** dans Paramètres ;
- bouton **Relancer à la prochaine connexion** ;
- le tutoriel reste également disponible dans Aide.

## Profil
- page simplifiée : identité, e-mail, rôle, mot de passe et accès direct aux Paramètres ;
- sauvegardes / données déplacées dans Paramètres pour le Gérant.

## Accueil public
- réduction importante du texte ;
- remplacement des longues sections verticales par des **onglets flottants** : Aperçu, Journées, Scanner, HACCP, Équipe, Tarif ;
- contenu court et interactif ;
- tarif et avertissement HACCP conservés.

## Base de données
Migration `030_user_settings_v671.sql`.

## E-mails
- logo HygieSafe placé dans un cartouche blanc avec fond explicite et largeur 210 px afin d'améliorer le rendu dans Gmail et les clients en mode sombre.
