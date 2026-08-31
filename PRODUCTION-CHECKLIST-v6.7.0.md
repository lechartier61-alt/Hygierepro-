# HygieSafe v6.7.0 — Checklist avant mise en production

Cette checklist distingue ce qui est déjà intégré dans le code de ce qui doit encore être réalisé dans les comptes et procédures réels de LIVRICI.

## 1. Technique — bloquant
- [ ] générer et versionner un vrai `package-lock.json` dans un environnement ayant accès au registre npm ;
- [ ] utiliser ensuite `npm ci` dans la CI / production ;
- [ ] appliquer toutes les migrations jusqu'à `029_v670_production_reliability.sql` ;
- [ ] exécuter la suite complète de tests avec PostgreSQL et toutes les dépendances installées ;
- [ ] tester une restauration réelle d'une sauvegarde ZIP dans une base temporaire ;
- [ ] vérifier HTTPS, `APP_URL`, `PUBLIC_SITE_URL`, `ALLOWED_ORIGINS` et `SESSION_COOKIE_SECURE=true` ;
- [ ] vérifier stockage privé S3 ou Railway Volume ;
- [ ] tester Resend : vérification e-mail, invitation et reset mot de passe ;
- [ ] tester Admin + TOTP 2FA ;
- [ ] tester la séparation de données avec deux organisations indépendantes.

## 2. Journées guidées
- [x] création d'une journée ;
- [x] modification complète avant démarrage ;
- [x] modification d'une journée en cours uniquement sur les étapes futures ;
- [x] étapes actives/terminées figées ;
- [x] quantité réellement réalisée ;
- [x] signalement Employé avec motif, note et photo ;
- [x] historique de modification ;
- [x] contrôle ancien ou réutilisé refusé comme nouvelle preuve ;
- [x] médias de preuve verrouillés ;
- [x] photos de blocage incluses dans la sauvegarde.

## 3. Informations légales LIVRICI — bloquant avant ouverture publique
Les données de société connues sont préremplies. Il reste à renseigner avec des informations réellement suivies :
- [ ] `LEGAL_EMAIL` ;
- [ ] `LEGAL_PHONE` ;
- [ ] `LEGAL_PRIVACY_EMAIL` ;
- [ ] `LEGAL_PUBLISHER` après confirmation du directeur de publication actuel.

Ne pas inventer ces informations. Vérifier aussi les coordonnées de l'hébergeur avant mise en ligne.

## 4. RGPD / contrats
- [x] politique de confidentialité ;
- [x] CGU ;
- [x] CGV B2B ;
- [x] DPA article 28 ;
- [x] page sous-traitants ;
- [x] preuve d'acceptation versionnée ;
- [ ] conserver les DPA/clauses de transfert réellement applicables aux comptes Railway, Resend, Stripe et au stockage utilisé ;
- [ ] tenir le registre des traitements de LIVRICI et le registre des traitements réalisés comme sous-traitant ;
- [ ] documenter les durées de conservation par finalité ;
- [ ] mettre en place la procédure d'exercice des droits ;
- [ ] mettre en place la procédure de violation de données ;
- [ ] fournir aux clients les éléments leur permettant d'informer leurs salariés/utilisateurs.

## 5. Pointeuse / salariés
- [ ] informer les salariés avant activation d'un suivi du temps ;
- [ ] définir les personnes habilitées à accéder aux historiques ;
- [ ] documenter la durée de conservation retenue selon la finalité et les obligations de l'employeur ;
- [ ] conserver uniquement les données nécessaires.

Le projet conserve son réglage configurable existant. Il ne force pas artificiellement une durée unique : la durée doit être justifiée par l'employeur selon son usage et les prescriptions applicables.

## 6. Stripe / TVA — bloquant avant abonnement live
- [ ] activer Stripe Tax dans le Dashboard lorsque cette configuration est retenue ;
- [ ] Railway : `STRIPE_AUTOMATIC_TAX=true` ;
- [ ] Railway : `STRIPE_PRICE_TAX_BEHAVIOR=exclusive` ;
- [ ] Railway : `STRIPE_COLLECT_TAX_ID=true` ;
- [ ] vérifier les informations légales et TVA de LIVRICI dans Stripe ;
- [ ] tester un client B2B France ;
- [ ] tester les cas UE/hors France uniquement sur les marchés réellement ouverts et valider le traitement avec le conseil comptable/fiscal ;
- [ ] vérifier la facture générée / solution comptable retenue.

## 7. Facturation électronique France
- [ ] avant l'échéance légale de réception : disposer d'une plateforme agréée adaptée à LIVRICI ;
- [ ] préparer l'émission au calendrier applicable à la catégorie de LIVRICI ;
- [ ] vérifier avec le cabinet comptable le circuit Stripe → comptabilité → plateforme de facturation électronique ;
- [ ] conserver les pièces comptables selon la durée légale applicable.

## 8. Positionnement HACCP
- [x] le site ne promet pas de certification automatique ;
- [x] l'application préserve les preuves et corrections ;
- [ ] les CGV, supports commerciaux et commerciaux LIVRICI doivent conserver ce même positionnement ;
- [ ] chaque établissement client reste responsable de ses seuils, fréquences, procédures et actions correctives.

## 9. Validation finale terrain
Avant commercialisation large, effectuer un pilote réel avec plusieurs établissements et appareils :
- [ ] Android + iPhone + ordinateur ;
- [ ] réseau instable ;
- [ ] 100+ vrais scans variés ;
- [ ] plusieurs employés simultanés ;
- [ ] sauvegarde + restauration ;
- [ ] contrôle d'accès croisé entre comptes ;
- [ ] test du parcours inscription → paiement test → tutoriel → première journée → sauvegarde.
