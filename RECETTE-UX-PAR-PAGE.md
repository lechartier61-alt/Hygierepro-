# Recette de validation utilisateur — HygieSafe · UX Refondue

Utiliser un jeu de données de test et ne pas confondre un passage de recette UX avec une validation de conformité HACCP.

## Contrôle transversal (sur chaque écran)

- [ ] Intitulé et objectif correspondent à la tâche ; lien « Comment procéder ? » propose trois étapes compréhensibles.
- [ ] Le bouton ou le formulaire principal se trouve rapidement, sans chercher plusieurs minutes.
- [ ] La recherche retrouve le module par son nom et par une action métier (date, frigo, produit, facture...).
- [ ] Aucune action ne devient visible à un rôle qui ne devrait pas la faire.
- [ ] Après enregistrement, le bon statut / message est visible, la page se met à jour, une éventuelle erreur est compréhensible.
- [ ] Sur mobile, le texte, les boutons, les tableaux et les modales ne débordent pas.
- [ ] Le guidage ne gêne pas la saisie, ni la lecture de l'historique, ni l'impression.

## Parcours de recette conseillés

| Parcours | Modules à parcourir | Attendu |
|---|---|---|
| Service du matin | Aujourd'hui → À traiter → Contrôles → Ma journée | Priorités explicites et actions suivies |
| Livraison | Réceptions → Scanner → Traçabilité → Inventaire | Produit, lot, photo et date vérifiables |
| Fabrication | Recettes → Production & lots → Étiquettes → Traçabilité | Lien ingrédients/production correctement restitué |
| Chambre froide | Équipements → Capteurs → Contrôles → Non-conformités | Mesure, alerte et correctif documentés |
| Approvisionnement | Inventaire → Commandes fournisseurs → Réceptions | Besoin, commande et arrivée cohérents |
| Vie d'équipe | Équipe → Journées équipe → Ma journée → Pointeuse | Rôles et planning séparés correctement |
| Audit | Historique → Journal → Rapports → Documents | Recherche, export et pièces justificatives |
| Compte | Profil → Paramètres → Établissement → Abonnement | Modifications et permissions conformes |
| Administrateur | Vue globale → Entreprises → Utilisateurs → Abonnements | Isolation des fiches et contrôles d'accès |
| Supervision technique | État du système → Incidents → Journal d'activité | Diagnostic et traçabilité des décisions |

## Points bloquants avant diffusion aux clients

- [ ] Tous les scénarios métier ci-dessus passent en **conditions réelles de test**.
- [ ] Code et statut serveur 6.8.4 identiques sur front/back ; aucune migration non prévue.
- [ ] Tests de sécurité, 2FA administrateur, uploads et isolation multi-entreprises concluants.
- [ ] Photographies/scanner testés sur Android, iPhone et bureau HTTPS.
- [ ] Stripe, Resend, stockage permanent et sauvegarde/restauration testés de bout en bout.
- [ ] Test RGPD et documents juridiques validés par la personne responsable.
