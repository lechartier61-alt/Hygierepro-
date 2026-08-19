# LGY.fr V5 — boutique paramétrable

Cette version consolide le prototype LGY avec un parcours client plus fluide et une administration davantage paramétrable.

## Fonctionnalités opérationnelles

- catalogue, fiches produits, tailles et messages personnalisés ;
- panier avec modification des quantités ;
- codes promotionnels recalculés côté serveur ;
- retrait ou livraison selon les paramètres administrateur ;
- frais de livraison et seuil de gratuité ;
- codes postaux autorisés ;
- dates minimales, jours fermés, créneaux et capacité maximale ;
- protection contre les doubles commandes par clé d’idempotence ;
- suivi sécurisé par numéro de commande et jeton secret ;
- fidélité calculée en points ;
- dashboard, commandes, clients, produits, promotions et paramètres ;
- sécurité V4 conservée : CSP, CSRF, cookies HttpOnly, scrypt, rate limiting, audit et validation serveur.


## Démarrage automatique sur Railway

La V5.1 ne plante plus si les secrets ne sont pas encore configurés. Au premier démarrage, une clé de session et un mot de passe administrateur temporaire sont générés. Le mot de passe apparaît une seule fois dans les logs Railway. Consultez `RAILWAY.md` pour les étapes complètes.

## Démarrage

```bash
cp .env.example .env
npm run hash-password -- "VotreMotDePasseLong"
# Reporter le hash dans ADMIN_PASSWORD_HASH
npm start
```

Ouvrir `http://localhost:3000`.

## Paramètres modifiables depuis l’administration

Nom, téléphone, e-mail, adresse, titre et texte d’accueil, bandeau promotionnel, délai de préparation, commande minimum, frais et seuil de livraison gratuite, zones postales, créneaux, capacité par créneau, retrait, livraison et fidélité.

## Limites avant exploitation commerciale

Stripe, PostgreSQL, e-mails transactionnels, stockage d’images, sauvegardes externes, 2FA et rôles avancés nécessitent des services et clés de production. Aucun numéro de carte n’est stocké par cette application.

## Publier le projet sur GitHub

Le dépôt configuré est : `https://github.com/lechartier61-alt/LGY.git`.

### Méthode automatique sous Windows

1. Décompressez le projet.
2. Ouvrez le dossier `LGY-fr-MVP`.
3. Double-cliquez sur `push-github.cmd`, ou ouvrez Git Bash dans ce dossier.
4. Dans Git Bash, lancez :

```bash
./push-github.sh
```

Le script initialise Git, configure la branche `main`, ajoute le dépôt distant, crée le commit et lance le push.

Lors de la première authentification, GitHub peut ouvrir une fenêtre de navigateur. GitHub n'accepte plus le mot de passe du compte pour les opérations Git en HTTPS : utilisez la connexion proposée par Git Credential Manager ou un jeton d'accès personnel.

### Commandes manuelles équivalentes

```bash
git init
git branch -M main
git remote add origin https://github.com/lechartier61-alt/LGY.git
git add .
git commit -m "Initialisation LGY.fr V5"
git push -u origin main
```

Ne publiez jamais le fichier `.env`. Il est déjà exclu par `.gitignore`.


## Espace client V6.2

Cette version ajoute :

- création de compte client sécurisée ;
- connexion et déconnexion ;
- session client HttpOnly valable 30 jours ;
- modification du profil ;
- changement de mot de passe ;
- carnet d’adresses ;
- historique des commandes ;
- total dépensé et points fidélité ;
- rattachement automatique des nouvelles commandes au compte connecté ;
- protection CSRF et limitation des tentatives de connexion/inscription.

Les comptes sont actuellement conservés dans `data/customers.json`. Pour une exploitation à grande échelle, migrez les clients et commandes vers PostgreSQL.
