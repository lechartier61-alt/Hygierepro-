# START HERE — HygieSafe v6.7.3

1. Déployer le contenu de cette archive sur Railway.
2. Vérifier que `DATABASE_URL` référence bien le service PostgreSQL Railway.
3. Laisser la commande de migration s'exécuter : `npm run migrate`.
4. Vérifier que la migration `032_professional_pages_v673.sql` est appliquée.
5. Ouvrir HygieSafe sur ordinateur puis sur mobile.
6. Tester au minimum un compte Gérant, Responsable et Employé.
7. Vérifier les pages Contrôles, Scanner, Traçabilité, Équipe, Fournisseurs et Paramètres.
8. Tester Connexion, Inscription, Mot de passe oublié, Invitation et Vérification e-mail sur mobile.
9. Vérifier la lisibilité des pages Mentions légales, Confidentialité, CGU, CGV et DPA.
10. Faire un rechargement complet/PWA si un appareil conserve l'ancien design : le cache est maintenant `hygiesafe-v6.7.3-shell`.

La refonte v6.7.3 ne change pas le schéma métier : la migration 032 synchronise uniquement la version installée.
