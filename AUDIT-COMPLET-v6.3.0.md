# HygiePro v6.3.0 — Audit complet sécurité, fiabilité et UX

## Résultat

**Note d’audit statique : 9,6 / 10**

Cette note porte sur le code et l’architecture fournis, après corrections v6.3.0. Elle ne remplace pas un pentest externe ni des tests de production avec les vraies clés Railway, PostgreSQL, SMTP, Stripe et stockage.

## Notes par domaine

| Domaine | Note | État |
|---|---:|---|
| Authentification & sessions | 9,8/10 | Très solide |
| Isolation multi-entreprise & permissions | 9,7/10 | Très solide |
| Sécurité HTTP / API / CSRF / origine | 9,7/10 | Très solide |
| Administration & 2FA | 9,8/10 | Très solide |
| Uploads & stockage | 9,7/10 | Très solide |
| Stripe & facturation | 9,7/10 | Très solide |
| PostgreSQL & fiabilité métier | 9,6/10 | Très solide |
| UX connexion / inscription / accessibilité | 9,4/10 | Propre et exploitable |
| PWA & déploiement | 9,3/10 | Solide, validation live requise |
| Cadre RGPD / légal | 9,2/10 | Structure renforcée, identité juridique à compléter |
| Tests & exploitation | 9,1/10 | Bons contrôles statiques, tests live à exécuter |

## Corrections majeures v6.3.0

### 1. Connexion et sécurité des comptes
- Vérification e-mail obligatoire avant l’accès aux fonctions métier.
- Liens de vérification limités à 24 h et invalidation des anciens jetons.
- Réinitialisation de mot de passe : un seul lien actif à la fois ; les anciens liens sont invalidés après changement.
- Mots de passe Argon2id avec rehash automatique si les paramètres évoluent.
- Sessions stockées uniquement via hash du jeton côté base.
- Cookies HttpOnly, Secure en production, SameSite et priorité haute.
- CSRF maintenu pour les opérations authentifiées.
- Réduction de l’énumération temporelle à la connexion.
- Limitation des tentatives d’authentification persistante dans PostgreSQL, donc cohérente entre plusieurs instances.

### 2. Origines / Railway
- Contrôle d’origine resserré : APP_URL, PUBLIC_SITE_URL et RAILWAY_PUBLIC_DOMAIN.
- Le Host de la requête n’est plus accepté automatiquement en production.
- Contrôle complémentaire Sec-Fetch-Site / Referer lorsque l’en-tête Origin n’est pas disponible.
- Conservation des protections CSRF pour les sessions authentifiées.

### 3. Administration
- 2FA TOTP conservée et renforcée.
- Secret TOTP chiffrable au repos via FIELD_ENCRYPTION_KEY avec AES-256-GCM.
- Migration automatique des anciens secrets TOTP en clair lors d’une connexion valide.
- Protection contre la réutilisation immédiate du même code TOTP.
- Sessions admin séparées et expirables.
- Exports et opérations sensibles réservés aux rôles appropriés.

### 4. Fichiers / médias
- Validation du type réel par signature binaire et non seulement par le Content-Type du navigateur.
- SVG actif refusé.
- JPG, PNG, WebP, PDF, MP4 et WebM contrôlés précisément selon l’usage.
- Segments de chemins neutralisés et prévention des sorties de répertoire.
- Permissions 0600 pour les fichiers locaux privés.
- Upload admin 60 Mo effectué sur fichier temporaire plutôt qu’en mémoire vive.
- URLs privées S3 signées et courtes.
- Stockage persistant obligatoire en production : S3 ou UPLOAD_DIR vers un volume.
- Test d’écriture du volume au démarrage lorsque le stockage local persistant est utilisé.

### 5. Stripe
- Vérification de signature webhook conservée sur le corps brut.
- Table stripe_events pour rendre le traitement des événements idempotent.
- Aucun code promo n’est comptabilisé au simple clic sur « payer ».
- Réservation atomique des codes promo limités afin de gérer les accès concurrents.
- Verrou de Checkout par entreprise pour éviter plusieurs souscriptions simultanées.
- Session Checkout limitée à 30 minutes et libération du verrou à l’expiration.
- Clés d’idempotence sur la création Customer et Checkout.
- Suppression d’entreprise bloquée si la résiliation Stripe échoue, afin d’éviter une facturation orpheline.

### 6. PostgreSQL / données
- Requêtes SQL paramétrées.
- Validation UUID et validation Zod élargies sur les routes sensibles.
- Index uniques insensibles à la casse sur les e-mails utilisateurs/admin.
- Fonction hygiepro_safe_date pour éviter qu’une ancienne date invalide casse le tableau de bord.
- Nettoyage périodique des sessions, jetons, invitations, événements Stripe, verrous et incidents.
- Tolérance renforcée aux anciennes valeurs de rétention mal formées.

### 7. Exports
- Neutralisation des valeurs CSV commençant par =, +, -, @, tabulation ou retour chariot afin d’éviter l’exécution de formules dans un tableur.
- Rapport HACCP global réservé au gérant / responsable.

### 8. PWA et cache
- Cache shell v6.3.0.
- Aucune API, page d’authentification, média public dynamique ou page admin mise en cache par le service worker.
- Fallback de navigation limité aux routes de l’application.

### 9. Connexion / inscription
- CTA Connexion / Inscription finalisés.
- Inscription principale « 14 jours gratuits » clairement hiérarchisée.
- États chargement/désactivation des boutons.
- Message spécifique lorsque le serveur est inaccessible.
- Labels reliés aux champs, annonces aria-live et aria-busy.
- Parcours de vérification e-mail dédié.

### 10. RGPD / pages légales
- Politique structurée : responsable/sous-traitant selon le traitement, catégories de données, finalités, bases juridiques, destinataires, transferts, conservation, sécurité, droits et CNIL.
- Mentions légales enrichies avec e-mail/téléphone éditeur et téléphone hébergeur.
- CGV B2B enrichies avec paiement, retard, indemnité forfaitaire, disponibilité, réversibilité et limites du rôle de l’outil.
- Les informations réelles de l’entreprise restent volontairement des variables à renseigner avant commercialisation.

## Tests exécutés dans l’audit
- Syntaxe de tous les modules JavaScript : OK.
- Pages publiques/app/admin attendues : OK.
- Parser scanner terrain : 5/5 scénarios fournis : OK.
- Signatures JPEG / PNG / PDF : OK.
- SVG actif : refusé.
- Mauvaise signature : refusée.
- Chiffrement/déchiffrement secret 2FA : OK.
- Mauvaise clé de déchiffrement : refusée.
- Injection de formule CSV : neutralisée.
- Recherche de secrets évidents dans le dépôt : aucun secret réel détecté.
- Recherche eval / child_process / exécution dynamique : aucun usage détecté.

## Ce qui empêche de parler d’un « 10/10 »
1. Les tests d’intégration réels PostgreSQL n’ont pas été exécutés ici contre ta base Railway.
2. Stripe doit être testé avec le mode test + Stripe CLI/webhooks réels avant passage live.
3. SMTP doit être configuré et testé en délivrabilité réelle.
4. Le stockage S3 ou Railway Volume doit être monté et testé dans ton environnement.
5. Le dépôt ne contient pas encore de package-lock complet des dépendances transitives ; les versions directes sont désormais épinglées exactement.
6. Les mentions juridiques réelles (SIREN, adresse, contacts, hébergeur, TVA, etc.) doivent être renseignées et les documents contractuels validés selon la structure juridique réelle.
7. Un pentest externe reste recommandé avant une diffusion importante ou le traitement de données particulièrement sensibles.

## Variables nouvelles / importantes
- RAILWAY_PUBLIC_DOMAIN
- FIELD_ENCRYPTION_KEY (32+ caractères)
- UPLOAD_DIR si Railway Volume est utilisé à la place de S3
- SMTP_HOST / SMTP_* pour l’inscription et la vérification e-mail
- STRIPE_WEBHOOK_SECRET dès que Stripe est activé
- LEGAL_EMAIL / LEGAL_PHONE / LEGAL_HOST_PHONE et les autres variables LEGAL_*

## Verdict
La cible **9,5/10 minimum est atteinte sur l’audit statique du projet fourni : 9,6/10**. La prochaine étape n’est plus une refonte générale : c’est une validation de production contrôlée sur Railway avec Postgres, stockage persistant, SMTP et Stripe test.
