# Déploiement Railway — HygieSafe v6.3.2

## 1. PostgreSQL
Ajoutez PostgreSQL dans le projet Railway et reliez `DATABASE_URL` au service HygieSafe. Le démarrage exécute les migrations jusqu’à `008_backup_resend.sql`.

## 2. URLs
Exemple avec le domaine Railway :

```text
APP_URL=https://votre-service.up.railway.app
PUBLIC_SITE_URL=https://votre-service.up.railway.app
RAILWAY_PUBLIC_DOMAIN=votre-service.up.railway.app
SESSION_COOKIE_SECURE=true
```

Avec un domaine personnalisé, `APP_URL` / `PUBLIC_SITE_URL` doivent contenir l’URL HTTPS réelle.

## 3. Chiffrement 2FA
Ajoutez une clé longue et aléatoire :

```text
FIELD_ENCRYPTION_KEY=<32 caractères minimum, idéalement une valeur aléatoire plus longue>
```

Exemple local de génération : `openssl rand -base64 32`.

## 4. Stockage persistant
Choisissez **une** solution.

### Railway Volume
Montez un Volume (par exemple `/data`) puis :

```text
UPLOAD_DIR=/data/uploads
```

### S3 compatible
Configurez `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` selon le fournisseur et `S3_PUBLIC_BASE_URL` si nécessaire. Reportez-vous à `.env.example` pour les noms exacts utilisés par l’application.

L’application refuse de démarrer en production si aucun stockage persistant n’est configuré.

## 5. Resend (e-mails)
Resend est le fournisseur recommandé pour les e-mails transactionnels. Ajoutez :

```text
RESEND_API_KEY=re_...
RESEND_FROM=HygieSafe <noreply@votre-domaine.fr>
```

Le domaine utilisé dans `RESEND_FROM` doit être vérifié dans Resend. Les anciennes variables SMTP restent disponibles uniquement comme solution de secours.

## 6. Stripe
Quand Stripe est activé, renseignez `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`. Le webhook cible `/api/billing/webhook`.

## 7. Juridique
Complétez toutes les variables `LEGAL_*` de `.env.example` avant commercialisation.

## 8. Vérification
Après déploiement :

- ouvrez `/health` : `ok: true`, `version: 6.3.2`, stockage `s3` ou `volume` ;
- créez un compte test et vérifiez l’e-mail ;
- terminez l’onboarding ;
- testez upload, scanner, fournisseur, export et la sauvegarde ZIP complète ;
- testez Stripe en mode test ;
- vérifiez l’admin + 2FA ;
- vérifiez l’affichage mobile de connexion/inscription.

## Initialisation du compte Admin — v6.5.3

Définissez dans Railway :

```env
ADMIN_EMAIL=votre-email-admin@domaine.fr
ADMIN_PASSWORD=<mot de passe aléatoire de 14 caractères minimum>
FIELD_ENCRYPTION_KEY=<clé aléatoire stable de 32 caractères minimum>
```

Au démarrage, si aucun administrateur n’existe encore, HygieSafe crée automatiquement le premier compte. Une fois un administrateur présent, les redéploiements ne modifient ni son adresse ni son mot de passe. `FIELD_ENCRYPTION_KEY` doit rester stable pour pouvoir relire le secret 2FA.
