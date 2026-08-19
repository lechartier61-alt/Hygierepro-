# Déploiement LGY.fr V6 sur Railway

1. Envoyez ce dossier sur GitHub.
2. Dans Railway, créez un service depuis le dépôt GitHub.
3. Railway détecte automatiquement `npm start`.
4. Ajoutez dans **Variables** :

```env
NODE_ENV=production
ADMIN_EMAIL=admin@lgy.fr
ADMIN_PASSWORD_HASH=<hash scrypt>
TOKEN_SECRET=<clé aléatoire de 48 octets ou plus>
TRUST_PROXY=1
ALLOWED_HOSTS=<votre-domaine.up.railway.app>,lgy.fr,www.lgy.fr
```

Générer le hash :

```bash
npm run hash-password -- "VotreMotDePasseFort"
```

Générer le secret :

```bash
openssl rand -base64 48
```

Test de santé : `/api/health`.

## Important

- Ne publiez jamais `.env`, `TOKEN_SECRET` ou le mot de passe.
- Les fichiers JSON conviennent au MVP. Pour une exploitation commerciale à fort volume, passez ensuite à PostgreSQL.
- Stripe n’est pas activé sans clés Stripe de production.


## Correction Railway V6.1

Le endpoint `/api/health` répond maintenant avant le filtrage des noms d’hôte et accepte les méthodes GET et HEAD. Cela permet au healthcheck interne Railway d’obtenir HTTP 200 sans affaiblir la protection Host des autres routes.
