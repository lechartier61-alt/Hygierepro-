# HygieSafe — Checklist juridique France avant production (24 août 2026)

> Checklist produit/opérationnelle. Elle ne remplace pas la validation d'un avocat, expert-comptable ou DPO lorsque la situation l'exige.

## 1. Identité de l'éditeur — intégrée

- LIVRICI SOLUTIONS SAS (LIVRICI), SAS au capital de 2,00 € ;
- SIREN 100 815 471 ; SIRET siège 100 815 471 00014 ;
- RCS Vannes / RNE ;
- TVA intracommunautaire FR37 100 815 471 ;
- APE actuel : 62.01Z — Programmation informatique ;
- siège : Lot 4 ZAC des Hameaux Verts, 5 Rue des Tulipiers, 56250 La Vraie-Croix, France ;
- hébergeur Railway préconfiguré avec ses coordonnées actuelles ; directeur de publication configurable et à confirmer.

Le code NAF 2025 62.10Y devient le code de référence à compter du 1er janvier 2027. Ne pas remplacer 62.01Z avant cette date dans les mentions courantes.

## 2. BLOQUANT avant ouverture commerciale

- [ ] renseigner `LEGAL_EMAIL` avec une adresse réellement consultée ;
- [ ] renseigner `LEGAL_PHONE` avec un numéro réellement joignable ;
- [ ] renseigner `LEGAL_PRIVACY_EMAIL` (peut être la même adresse si elle est effectivement suivie) ;
- [ ] confirmer que `LEGAL_PUBLISHER` correspond bien au représentant/directeur de publication actuel ;
- [ ] conserver les coordonnées d'hébergement exactes et les mettre à jour si Railway ou l'infrastructure change.

## 3. RGPD — obligatoire

- [x] politique de confidentialité ;
- [x] distinction responsable du traitement / sous-traitant ;
- [x] base d'accord de sous-traitance article 28 (`/dpa.html`) ;
- [x] page publique des principaux sous-traitants (`/subprocessors.html`) ;
- [x] nouvelles inscriptions : CGV + CGU + DPA acceptés et versionnés, politique de confidentialité portée à connaissance ;
- [ ] pour tout client existant antérieur à cette version, obtenir une acceptation valable de la version contractuelle applicable avant la commercialisation si nécessaire ;
- [ ] conserver/valider les DPA et mécanismes de transfert de Railway, Resend, Stripe et du fournisseur S3 réellement utilisé ;
- [ ] tenir le registre des activités de traitement dont LIVRICI est responsable et le registre des activités réalisées comme sous-traitant ;
- [ ] documenter les durées de conservation par catégorie ;
- [ ] disposer d'une procédure d'exercice des droits ;
- [ ] disposer d'un registre/procédure des violations ; notification CNIL dans les 72 h lorsqu'une violation est susceptible d'engendrer un risque ;
- [ ] informer les salariés/utilisateurs au niveau du client lorsque leurs données sont traitées (notamment horaires/pointeuse/journées guidées).

Un DPO n'est pas automatiquement obligatoire pour toute petite société SaaS : vérifier les critères de l'article 37 RGPD et réévaluer si l'activité devient un suivi régulier et systématique à grande échelle.

## 4. Cookies

Si HygieSafe n'utilise que les cookies strictement nécessaires à l'authentification et à la sécurité, aucun bandeau de consentement n'est requis pour ces seuls cookies, mais l'information reste fournie. Tout analytics non exempté, publicité ou autre traceur non essentiel devra être désactivé avant consentement.

## 5. Contrat / CGV B2B

- [x] CGV professionnelles publiées ;
- [x] prix, durée, paiement, résiliation, responsabilité, droit applicable ;
- [x] pénalités de retard et indemnité forfaitaire de 40 € ;
- [x] positionnement : HygieSafe assiste le professionnel mais ne garantit pas automatiquement sa conformité sanitaire ;
- [x] le logiciel conserve pour les nouvelles inscriptions la version des CGV/CGU/DPA et la prise de connaissance de la politique de confidentialité (date + compte + IP + user-agent) ;
- [ ] définir la procédure de renouvellement d’acceptation lors d’une modification substantielle des contrats.

Si le service reste exclusivement B2B, les règles propres aux consommateurs (médiateur de la consommation, rétractation consommateur, résiliation « 3 clics » applicable aux contrats consommateurs selon son champ) ne sont pas à ajouter par défaut. Refaire l'audit avant toute offre B2C.

## 6. Facturation LIVRICI

- [ ] factures avec numérotation unique, continue et chronologique ;
- [ ] identité vendeur/acheteur, dates, détail de la prestation, montants HT, TVA, TTC, échéance ;
- [ ] pénalités de retard + indemnité forfaitaire 40 € pour les clients professionnels ;
- [ ] mentions spécifiques applicables selon le régime de TVA ;
- [ ] conservation des factures pendant 10 ans au titre des pièces comptables ;
- [ ] préparer les nouvelles mentions de la réforme (notamment SIREN du client professionnel, nature des opérations et autres mentions applicables) ;
- [ ] **avant le 1er septembre 2026 : choisir/activer une plateforme agréée permettant à LIVRICI de recevoir les factures électroniques** ;
- [ ] émission électronique selon le calendrier applicable à la taille de LIVRICI (PME/TPE : 1er septembre 2027, sous réserve de l'éligibilité/catégorie exacte de l'entreprise).

Stripe peut gérer le paiement et produire des documents de facturation, mais cela ne dispense pas LIVRICI de respecter le dispositif français de facturation électronique et de choisir la plateforme agréée nécessaire.

## 7. HACCP / traçabilité alimentaire

HygieSafe est un outil d'assistance aux établissements alimentaires. Les clients restent responsables de leur PMS, de leurs procédures fondées sur les principes HACCP et de la traçabilité requise par la réglementation alimentaire.

Le produit doit donc :

- préserver les preuves et leur horodatage ;
- conserver un historique des corrections/annulations ;
- permettre l'export et la présentation des enregistrements ;
- ne pas annoncer qu'un abonnement rend automatiquement l'établissement « conforme HACCP » ;
- laisser au client la définition des contrôles, seuils, fréquences et durées adaptées à son activité.

## 8. EORI

Aucun numéro EORI n'est nécessaire uniquement pour éditer et vendre HygieSafe en France. Il devient pertinent si LIVRICI effectue elle-même des opérations douanières/import-export nécessitant un enregistrement EORI.

## TVA du SaaS / Checkout Stripe — v6.6.1

Le tarif public est désormais exprimé **9,99 € HT / mois / entreprise**. Avant d'activer Stripe en production :

- [ ] activer Stripe Tax / calcul automatique de taxe ;
- [ ] collecter l'adresse de facturation ;
- [ ] collecter le n° TVA intracommunautaire lorsqu'il existe ;
- [ ] tester le traitement fiscal des clients France / UE / hors UE selon les marchés réellement ouverts ;
- [ ] faire valider le paramétrage fiscal par le cabinet comptable si LIVRICI vend hors de France ou applique des cas d'autoliquidation.
