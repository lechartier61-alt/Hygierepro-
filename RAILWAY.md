# Déploiement Railway

Cette version ne plante plus lorsque `TOKEN_SECRET` et `ADMIN_PASSWORD_HASH` sont absents.

Au premier démarrage, le serveur :

1. génère automatiquement une clé de session sécurisée ;
2. crée un mot de passe administrateur temporaire ;
3. affiche ce mot de passe une seule fois dans les logs Railway.

## Première connexion

Dans Railway, ouvrez **Deployments > View logs** et recherchez :

```text
IDENTIFIANTS ADMINISTRATEUR TEMPORAIRES
```

Utilisez l'e-mail `admin@lgy.fr` et le mot de passe affiché.

## Configuration permanente recommandée

Ajoutez ensuite ces variables dans **Variables** :

```text
NODE_ENV=production
ADMIN_EMAIL=admin@lgy.fr
ADMIN_PASSWORD=un-mot-de-passe-long-de-12-caracteres-minimum
TOKEN_SECRET=une-cle-aleatoire-d-au-moins-32-caracteres
TRUST_PROXY=1
```

Vous pouvez générer une clé avec Git Bash :

```bash
openssl rand -base64 48
```

Pour utiliser un hash plutôt qu'un mot de passe en clair :

```bash
npm run hash-password -- "VotreMotDePasseTresFort"
```

Puis remplacez `ADMIN_PASSWORD` par `ADMIN_PASSWORD_HASH` dans Railway.

Railway fournit automatiquement `PORT`. Ne le configurez pas manuellement.

## Correction « Hôte non autorisé »

La version 5.2 reconnaît automatiquement :

- le domaine public fourni par Railway via `RAILWAY_PUBLIC_DOMAIN` ;
- tous les domaines Railway se terminant par `.up.railway.app` ;
- `lgy.fr` et `www.lgy.fr` ;
- les domaines ajoutés manuellement dans `ALLOWED_HOSTS`.

Pour un autre domaine personnalisé, ajoutez par exemple :

```text
ALLOWED_HOSTS=monsite.fr,www.monsite.fr
```

Plusieurs domaines doivent être séparés par des virgules, sans `https://` ni chemin.
