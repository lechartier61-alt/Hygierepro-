# HygieSafe v6.6.1 — Analyse finale et état de préparation production

> **SUPERCÉDÉ PAR v6.7.0** — conservé uniquement comme historique de préparation. Pour la mise en production, utiliser les documents `*-v6.7.0.md`.

Date de préparation : 24 août 2026.

## Verdict
La base v6.6.0 a été renforcée sans refaire l’application. La v6.6.1 cible l’intégrité des preuves, les permissions, les journées guidées et les obligations juridiques indispensables avant commercialisation.

## Changements fonctionnels livrés
- modification de chaque journée par le Gérant/Responsable ;
- journée en cours : uniquement les étapes futures restent modifiables ;
- quantité réellement produite ;
- blocage Employé avec motif, note et photo facultative ;
- historique des modifications du programme ;
- preuves de blocage visibles même après la fin de l’étape ;
- contrôle HACCP d’une étape vérifié côté serveur (organisation, auteur, type, date, unicité).

## Intégrité / sécurité livrées
- horodatage officiel serveur pour les créations Employé ;
- révisions des preuves avant correction/annulation ;
- annulation logique des preuves concernées au lieu d’une suppression silencieuse ;
- fichier déjà lié à une preuve non supprimable ;
- permissions Employé réduites sur les historiques globaux et données fournisseur sensibles ;
- limiteur de mot de passe oublié par IP + e-mail haché ;
- acceptation juridique versionnée à l’inscription ;
- acceptations et révisions intégrées aux sauvegardes.

## Société éditrice intégrée
- LIVRICI SOLUTIONS SAS (LIVRICI) ;
- SAS au capital de 2,00 € ;
- SIREN 100 815 471 ;
- SIRET 100 815 471 00014 ;
- TVA FR37 100 815 471 ;
- APE actuel 62.01Z — Programmation informatique ;
- siège : Lot 4 ZAC des Hameaux Verts, 5 Rue des Tulipiers, 56250 La Vraie-Croix, France.

Le code NAF 2025 62.10Y est documenté comme futur code à utiliser à compter du 1er janvier 2027 et ne remplace pas le 62.01Z dans les mentions 2026.

## Points BLOQUANTS restant à faire par LIVRICI avant ouverture commerciale
1. Renseigner une adresse e-mail de contact réellement suivie.
2. Renseigner un numéro de téléphone réellement joignable.
3. Renseigner/valider le contact RGPD.
4. Confirmer le représentant légal/directeur de publication et remplir `LEGAL_PUBLISHER`.
5. Générer un véritable `package-lock.json` dans un environnement connecté, le versionner puis utiliser `npm ci`.
6. Exécuter la suite complète de tests avec PostgreSQL et toutes les dépendances installées.
7. Tester une restauration réelle d’une sauvegarde ZIP dans une base temporaire.
8. Choisir/activer avant le 1er septembre 2026 une plateforme agréée pour la réception des factures électroniques, si LIVRICI relève du champ d’application de la réforme (cas normal d’une société française assujettie à la TVA).
9. Vérifier que les factures LIVRICI comportent toutes les mentions B2B obligatoires et préparer les nouvelles mentions de la réforme.
10. Conserver les DPA/conditions applicables de Railway, Resend, Stripe et du stockage réellement utilisé ; tenir les registres RGPD et la procédure de violation.

## EORI
L’absence de numéro EORI n’empêche pas la commercialisation d’un SaaS en France. Un EORI devient obligatoire avant une opération douanière/import-export de marchandises qui le nécessite.

## Positionnement HACCP
HygieSafe doit être présenté comme un outil d’aide à l’organisation du PMS, aux procédures HACCP, à la traçabilité et à la conservation de preuves. Il ne doit pas promettre qu’un abonnement certifie ou rend automatiquement un établissement conforme. L’exploitant alimentaire reste responsable de ses procédures, seuils, fréquences, actions correctives et durées de conservation adaptées à son activité.

## Tests exécutés pendant la préparation
Les tests statiques et scénarios ne nécessitant pas l’installation du dossier `node_modules` ont été exécutés. Voir les résultats communiqués avec l’archive. Le test de sauvegarde complet nécessitant `archiver` et les tests d’intégration avec dépendances doivent être rejoués dans l’environnement connecté après génération du lockfile.

## Étape suivante — non modifiée ici
- refaire le tutoriel de première connexion pour expliquer tout le parcours selon le rôle ;
- revoir l’accueil public, son message commercial et son parcours d’inscription.

Ces deux chantiers sont volontairement séparés de la v6.6.1 afin de les concevoir sur une base fonctionnelle et réglementaire stabilisée.

## Correctif fiscal ajouté après audit

Le Checkout de la v6.6.0 créait l'abonnement à 9,99 € sans collecte obligatoire de l'adresse fiscale ni calcul automatique de TVA. La v6.6.1 corrige ce point : tarif public en **9,99 € HT**, `automatic_tax`, adresse de facturation, collecte d'identifiant fiscal et mise à jour du Customer Stripe. La production refuse désormais une configuration Stripe complète si le calcul automatique de taxe ou le comportement fiscal du prix n'est pas explicitement configuré.

Pour la pointeuse, la durée reste configurable. Elle doit être minimisée et documentée par l’employeur selon la finalité, les obligations et les délais de prescription applicables ; HygieSafe ne force pas artificiellement une durée unique.
