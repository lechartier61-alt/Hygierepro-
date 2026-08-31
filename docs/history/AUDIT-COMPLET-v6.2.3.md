# Audit complet HygiePro v6.2.3

Date : 17 août 2026

## Résumé

**Note globale du projet fourni : 7,8 / 10.**

HygiePro possède une base technique sérieuse pour un SaaS métier : séparation multi-entreprise, rôles, sessions serveur, mots de passe Argon2id, CSRF, limitation de tentatives, CSP/Helmet, 2FA super-admin, journal d'audit, PostgreSQL, Stripe, PWA, scanner/OCR et module fournisseurs.

La version 6.2.3 corrige les défauts visuels de connexion/inscription et quelques incohérences sûres. Avant une ouverture commerciale à grande échelle, les priorités restantes sont surtout Stripe/idempotence, vérification d'e-mail, durcissement des fichiers uploadés, reproductibilité npm et finalisation juridique/RGPD.

> Périmètre : audit statique du code fourni. Ce document n'est ni un pentest externe, ni un test d'intrusion, ni une validation juridique. Les flux Railway/PostgreSQL/Stripe/SMTP réels doivent encore être testés avec les secrets et services de production.

## Notes par domaine

| Domaine | Note | État |
|---|---:|---|
| Authentification & sessions | 8,2/10 | Bon |
| Isolation multi-entreprise & rôles | 8,6/10 | Très bon |
| API / PostgreSQL | 7,8/10 | Bon |
| Sécurité HTTP / CSRF / limitation | 8,0/10 | Bon |
| Administration | 8,1/10 | Bon |
| Scanner / traçabilité / fournisseurs | 8,2/10 | Bon |
| UX connexion / inscription après v6.2.3 | 8,6/10 | Très bon |
| Mobile / PWA | 8,1/10 | Bon |
| Stripe / facturation | 6,4/10 | À renforcer |
| Déploiement / maintenabilité | 6,9/10 | À renforcer |
| Juridique / RGPD | 6,1/10 | À finaliser |

## Points solides

### Authentification
- mots de passe hachés avec Argon2id ;
- jetons de session aléatoires puis hachés en base ;
- cookies `HttpOnly`, `Secure` en production et `SameSite=Strict` ;
- sessions persistantes séparées des mots de passe ;
- réinitialisation à jeton à durée limitée ;
- réponse générique sur « mot de passe oublié », réduisant l'énumération de comptes ;
- limitation des tentatives de connexion.

### Autorisations et multi-tenant
- les principales requêtes métier sont filtrées par `organization_id` ;
- rôles owner / manager / employee gérés côté API ;
- suppression d'un autre utilisateur limitée au périmètre de l'entreprise ;
- accès super-admin séparé du compte client ;
- 2FA TOTP imposée pour les écrans administratifs sensibles.

### Sécurité HTTP
- Helmet et CSP présents ;
- protection CSRF pour les requêtes mutantes authentifiées ;
- contrôle d'origine ;
- limites de taille JSON/formulaire ;
- erreurs 500 enregistrées dans les incidents sans renvoyer le détail technique au navigateur.

### Données et exploitation
- requêtes SQL majoritairement paramétrées ;
- transactions utilisées sur plusieurs parcours critiques ;
- journal d'audit ;
- nettoyages périodiques de sessions et jetons ;
- healthcheck avec test PostgreSQL ;
- CI GitHub avec PostgreSQL et smoke tests prévue.

## Priorités avant production

### P1 — Stripe : rendre les webhooks totalement idempotents
Le paiement par facture est protégé par un `ON CONFLICT`, mais les événements Stripe eux-mêmes ne sont pas enregistrés comme « déjà traités ». Un retry de `checkout.session.completed` peut donc incrémenter plusieurs fois `promo_codes.redemptions`.

**À faire :** table `stripe_events(event_id PRIMARY KEY, processed_at)` et traitement transactionnel unique de chaque événement.

### P1 — Ne pas appliquer le code promo avant paiement confirmé
`/api/billing/checkout` modifie actuellement `promo_code` et `monthly_amount_cents` lors de la création de la session Checkout. Si l'utilisateur abandonne la page Stripe, l'organisation peut conserver un prix promo alors que le paiement n'a jamais abouti.

**À faire :** ne persister le prix/promo qu'après l'événement Stripe confirmé.

### P1 — Vérification d'e-mail du propriétaire
Un propriétaire nouvellement inscrit est stocké avec `email_verified=false`, mais reçoit immédiatement une session et aucun parcours de vérification d'e-mail n'est implémenté.

**À faire :** e-mail de vérification à jeton haché, expiration courte, écran « vérifier votre adresse » et restrictions adaptées avant validation.

### P1 — Finaliser le juridique / RGPD
Les pages sont une bonne base mais contiennent encore des informations à renseigner et la politique de confidentialité doit être complétée selon les traitements réellement activés : bases légales, destinataires/sous-traitants, durées précises ou critères, transferts éventuels, droit de réclamation auprès de la CNIL, etc.

Les CGV B2B doivent aussi être complétées avec les conditions de règlement définitives, notamment les informations relatives aux retards de paiement et à l'indemnité forfaitaire de recouvrement lorsque cela s'applique.

### P2 — Fichiers uploadés
Le type de fichier est principalement accepté selon le MIME déclaré par le client. Les vidéos admin peuvent atteindre 60 Mo en `memoryStorage`.

**À faire :** vérifier la signature réelle du fichier (magic bytes), limiter les formats exacts, traiter les gros fichiers en streaming/stockage direct et prévoir antivirus si des documents externes sont conservés.

### P2 — Secret TOTP administrateur
Le secret TOTP est stocké en clair en base. C'est fonctionnel, mais une fuite de base compromettrait aussi le second facteur.

**À faire :** chiffrer le secret au repos avec une clé applicative distincte des données PostgreSQL et prévoir la rotation/récupération 2FA.

### P2 — Verrouillage des dépendances npm
Aucun `package-lock.json`, `npm-shrinkwrap.json`, `pnpm-lock.yaml` ou `yarn.lock` n'est fourni.

**À faire :** générer et versionner un lockfile, puis utiliser `npm ci` en CI et en build pour obtenir des installations reproductibles.

### P2 — Rate limiting multi-instance
Le rate limiter actuel utilise le stockage mémoire par défaut. Sur plusieurs instances Railway, chaque instance possède donc son propre compteur.

**À faire :** Redis/PostgreSQL store partagé si l'application est répliquée horizontalement.

### P2 — HTML dynamique côté application
Le frontend utilise de nombreux `innerHTML`. Les données utilisateur importantes inspectées sont généralement passées par `esc()`, ce qui est positif, mais cette architecture reste fragile face à une future régression XSS.

**À faire :** préférer `textContent` / création DOM pour les données utilisateur ou centraliser un mécanisme de rendu/sanitisation.

### P3 — Validation de limites
Quelques paramètres numériques, par exemple certains `limit`, devraient être bornés également côté schéma afin d'éviter des requêtes invalides ou des erreurs inutiles.

### P3 — Alertes DLC
Une date invalide dans certaines données JSON peut faire échouer le calcul SQL d'alertes et conduire au fallback `0`. Valider/normaliser toutes les dates à l'écriture rendrait le tableau de bord plus fiable.

## Corrections effectuées dans la v6.2.3

1. Nouvelle barre Connexion / Inscription sur l'accueil, plus compacte et professionnelle.
2. CTA Inscription avec « 14 jours gratuits » et hiérarchie visuelle claire.
3. Refonte des CTA des pages Connexion et Inscription.
4. État de chargement et prévention du double clic pendant l'authentification.
5. Message clair lorsque le serveur n'est pas joignable.
6. Logo/branding restauré sur les pages d'authentification mobile.
7. Cache Service Worker passé à `hygiepro-v6.2.3-shell`.
8. Healthcheck, logs et suivi `app_version` harmonisés en v6.2.3.
9. Migration PostgreSQL pour le défaut `app_version` en 6.2.3.
10. Les liens sensibles d'invitation/réinitialisation ne sont plus imprimés dans les logs **de production** quand SMTP n'est pas configuré.

## Tests réalisés sur la version 6.2.3

- vérification syntaxique Node sur `src/`, `public/js/`, `scripts/` : **OK** ;
- contrôle statique projet : **OK** ;
- scénarios scanner : **5/5 OK** ;
- présence migration fournisseurs : **OK** ;
- routes fournisseurs / logo / pages principales : **OK** ;
- équilibrage structure HTML et CSS des pages modifiées : **OK**.

## Ce qui reste à tester sur Railway

1. migration PostgreSQL réelle avec une copie/sauvegarde de la base ;
2. inscription, connexion, déconnexion et mot de passe oublié ;
3. invitation employé et responsable avec SMTP réel ;
4. essai de 14 jours et expiration ;
5. Stripe Checkout, portail, paiement réussi, paiement refusé et retry webhook ;
6. upload photo/PDF/vidéo avec stockage réel ;
7. scanner depuis Android/iPhone ;
8. création et export d'une commande fournisseur ;
9. suppression d'entreprise et export de données ;
10. administration + 2FA après redéploiement.

## Verdict

**HygiePro est nettement au-dessus d'un simple brouillon technique.** La base est exploitable pour une phase bêta contrôlée. Je ne considérerais cependant pas la facturation et le juridique comme « production finale » tant que les P1 ci-dessus ne sont pas traités et testés en environnement Railway réel.
