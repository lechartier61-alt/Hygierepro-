# HygieSafe v6.7.0 — Production, conformité, journées guidées et onboarding

Date : 24 août 2026.

## Journées guidées
- Le Gérant et le Responsable peuvent modifier chaque journée individuellement.
- Une journée `ready` reste entièrement modifiable.
- Une journée `in_progress` conserve ses étapes actives/terminées comme éléments figés ; les étapes futures peuvent être modifiées, réorganisées, ajoutées ou supprimées.
- Chaque modification significative ajoute un événement `plan_updated` à l'historique.
- Une étape de production peut comparer quantité cible et quantité réellement réalisée.
- L'Employé peut signaler `J'ai un problème` avec motif, note et photo facultative.
- Les blocages et leurs photos sont visibles dans la supervision et intégrés à la sauvegarde ZIP.

## Intégrité des preuves
- Pour les créations Employé, l'horodatage officiel est imposé par le serveur.
- Un contrôle lié à une étape doit appartenir à la bonne organisation, au bon employé, au type attendu, avoir été créé après le démarrage de l'étape et ne pas être déjà utilisé par une autre étape.
- Les corrections/annulations des preuves concernées créent une révision contenant l'état précédent.
- Les preuves métier concernées sont annulées logiquement (`voided`) au lieu d'être effacées silencieusement.
- Un média déjà utilisé comme preuve ne peut plus être supprimé physiquement par un rôle métier.

## Permissions et sécurité
- Le limiteur d'authentification ne se remet plus à zéro après chaque réponse réussie.
- La récupération de mot de passe comporte une limite supplémentaire par adresse e-mail hachée.
- L'Employé ne récupère plus l'historique global des relevés de l'organisation par défaut.
- Les données fournisseur sensibles, commandes et exports sont réservés aux rôles autorisés.
- L'accès aux médias d'un Employé est limité à ses propres fichiers et aux médias nécessaires à sa journée affectée.

## Contrats / RGPD
- CGV, CGU et DPA doivent être acceptés explicitement à l'inscription ; la politique de confidentialité doit être portée à connaissance.
- Version du document, utilisateur, organisation, date, IP et user-agent sont conservés.
- Les Gérant déjà existants sans preuve d'acceptation sont invités à régulariser à leur prochaine connexion.
- Ajout d'un DPA article 28 RGPD et d'une page listant les principaux sous-traitants.
- Les révisions de preuves et acceptations contractuelles sont incluses dans la sauvegarde complète.

## Stripe / fiscalité
- Tarif public : **9,99 € HT / mois / entreprise**.
- Checkout : adresse de facturation obligatoire, collecte de l'identifiant fiscal si applicable, `automatic_tax` et comportement fiscal `exclusive`.
- Une configuration Stripe production complète est refusée si ces paramètres fiscaux ne sont pas activés dans l'application.
- L'activation effective de Stripe Tax et le paramétrage fiscal du compte Stripe restent des actions externes à réaliser par LIVRICI.

## Tutoriel et accueil
- Tutoriel première connexion porté en version 3 et adapté au rôle : Gérant, Responsable, Employé.
- Le tutoriel explique les journées, les quantités réelles, les blocages, les contrôles, le scanner et les limites de chaque rôle.
- Accueil public entièrement réorganisé autour de trois piliers : Journées guidées, Scanner intelligent et Preuves HACCP.
- Positionnement juridique conservé : HygieSafe aide à organiser les procédures et preuves ; il ne constitue pas une certification automatique HACCP.

## Base de données
Migration : `029_v670_production_reliability.sql`.

Elle ajoute notamment : `actual_quantity`, informations de blocage, `record_revisions` et `legal_acceptances`.
