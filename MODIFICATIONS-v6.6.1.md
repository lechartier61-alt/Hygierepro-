# HygieSafe v6.6.1 — Fiabilité, journées équipe et préparation production

> **SUPERCÉDÉ PAR v6.7.0** — conservé uniquement comme historique de préparation. Pour la mise en production, utiliser les documents `*-v6.7.0.md`.

## Journées guidées
- le Gérant/Responsable peut modifier chaque journée individuellement ;
- journée prête : toutes les étapes restent modifiables ;
- journée en cours : étapes déjà actives/terminées verrouillées, étapes futures modifiables/ajoutables/supprimables ;
- historique `plan_updated` pour les modifications du programme ;
- quantité cible + quantité réellement réalisée ;
- bouton Employé « J’ai un problème » avec motif, note et photo facultative ;
- blocages visibles dans la supervision manager.

## Fiabilité des preuves
- horodatage officiel des créations Employé imposé par le serveur ;
- un contrôle HACCP lié à une étape doit appartenir au bon Employé, au bon type et avoir été créé après le démarrage de l’étape ;
- interdiction de recycler le même contrôle comme preuve de plusieurs étapes ;
- historique `record_revisions` avant correction/annulation ;
- les preuves métier sont annulées (`voided`) au lieu d’être supprimées ;
- une photo déjà référencée comme preuve ne peut plus être supprimée physiquement.

## Sécurité / permissions
- rate limiter d’authentification non réinitialisé automatiquement après chaque réponse 2xx ;
- mot de passe oublié : limite supplémentaire par adresse e-mail hachée (3 / 15 min) ;
- Employé : historique générique limité à ses propres saisies, configuration sensible interdite ;
- données fournisseur sensibles masquées pour l’Employé ;
- historique de commandes, exports et aperçus fournisseur réservés Gérant/Responsable ;
- accès fichier Employé limité à ses propres médias et aux médias de sa journée guidée.

## Juridique production France 2026
- informations LIVRICI SOLUTIONS SAS consolidées ;
- mentions légales enrichies SIREN/SIRET/APE ;
- politique de confidentialité clarifiée responsable/sous-traitant ;
- ajout d’un DPA article 28 RGPD ;
- acceptation versionnée CGV + CGU + DPA à l’inscription, avec preuve dans la sauvegarde ;
- ajout de la page sous-traitants/transferts ;
- checklist réforme facturation électronique ;
- e-mail, téléphone et contact RGPD restent volontairement non inventés et doivent être configurés avant ouverture commerciale.

## Non inclus volontairement
Le tutoriel de première connexion et la refonte de l’accueil seront repris dans l’étape suivante, comme prévu, après validation de cette base.

### Fiscalité / production
- tarif public explicité à 9,99 € HT / mois / entreprise ;
- Stripe Checkout : adresse de facturation obligatoire, collecte de n° TVA, `automatic_tax`, `tax_behavior` ;
- validation de configuration production bloque Stripe si le calcul fiscal n'est pas configuré ;
- conservation pointeuse : durée configurable conservée ; l’employeur doit documenter la durée retenue selon sa finalité et les obligations/prescriptions applicables.
