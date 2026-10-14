# HygieSafe v6.6.1 — Checklist mise en production

> **SUPERCÉDÉ PAR v6.7.0** — conservé uniquement comme historique de préparation. Pour la mise en production, utiliser les documents `*-v6.7.0.md`.

## Technique
- [ ] appliquer toutes les migrations jusqu'à `029_v670_production_reliability.sql` ;
- [ ] générer une fois un vrai `package-lock.json` avec `npm install`, le versionner, puis lancer les builds suivants avec `npm ci` ;
- [ ] exécuter la suite de tests ;
- [ ] vérifier `APP_URL`, `PUBLIC_SITE_URL`, `ALLOWED_ORIGINS` et HTTPS ;
- [ ] configurer stockage privé/S3 et sauvegardes ;
- [ ] tester une restauration de sauvegarde dans une base temporaire ;
- [ ] vérifier Resend et le domaine d'envoi ;
- [ ] vérifier Stripe + webhook signé ;
- [ ] vérifier compte admin + 2FA ;
- [ ] test multi-rôles Gérant / Responsable / Employé ;
- [ ] test de séparation entre deux organisations différentes.

## Journées guidées v6.6.1
- [ ] création d'une journée ;
- [ ] modification complète avant démarrage ;
- [ ] modification d'une journée en cours : seules les étapes futures sont éditables ;
- [ ] étapes actives/terminées immuables ;
- [ ] quantité réellement produite enregistrée ;
- [ ] blocage Employé enregistré avec motif/note/photo facultative ;
- [ ] ancien contrôle HACCP refusé comme preuve d'une nouvelle étape ;
- [ ] photo liée à une preuve impossible à supprimer.

## Juridique / entreprise
- [ ] renseigner e-mail, téléphone, contact RGPD ;
- [ ] confirmer directeur de publication ;
- [x] nouvelles inscriptions : CGV/CGU/DPA acceptés et versionnés ;
- [ ] traiter/recontractualiser les éventuels comptes clients créés avant v6.6.1 ;
- [ ] DPA fournisseurs / sous-traitants archivés ;
- [ ] registre RGPD et procédure violation ;
- [ ] plateforme agréée de facturation électronique activée pour réception avant le 01/09/2026 ;
- [ ] processus comptable/factures vérifié ;
- [ ] ne pas présenter HygieSafe comme une certification automatique HACCP.

## Étape suivante volontairement non incluse dans v6.6.1
- refonte du tutoriel de première connexion ;
- refonte de l'accueil public.

Ces deux sujets doivent être retravaillés ensemble après validation de cette base afin que le tutoriel explique exactement l'interface finale.

## TVA / Stripe — bloquant avant abonnement live

- [ ] activer Stripe Tax dans le Dashboard ;
- [ ] Railway : `STRIPE_AUTOMATIC_TAX=true` ;
- [ ] Railway : `STRIPE_PRICE_TAX_BEHAVIOR=exclusive` ;
- [ ] vérifier que 9,99 € est bien présenté comme **HT** sur toutes les pages ;
- [ ] tester la collecte d'adresse et de numéro de TVA dans Checkout ;
- [ ] vérifier les factures Stripe avec les coordonnées et le n° TVA de LIVRICI ;
- [ ] tester un client France et, si commercialisé hors France, les principaux cas UE/hors UE avec le conseil comptable/fiscal adapté.

## Pointeuse / données salariés

- [ ] si la pointeuse est activée, informer les salariés avant utilisation ;
- [ ] définir/documenter la durée de conservation réellement applicable ;
- [ ] documenter la durée de conservation de la pointeuse selon la finalité et les obligations/prescriptions applicables ;
- [ ] limiter l'accès aux historiques de temps aux personnes habilitées ;
- [ ] adapter la durée en cas de forfait ou autre justification légale/documentée.
