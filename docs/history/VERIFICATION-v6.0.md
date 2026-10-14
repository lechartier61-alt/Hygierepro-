# Vérification technique — HygiePro v6.0

## Contrôles réalisés localement

- syntaxe JavaScript de tous les fichiers : OK ;
- script `npm run check` : OK ;
- fichiers HTML requis : OK ;
- manifeste PWA : OK ;
- identifiants HTML dupliqués : aucun ;
- 22 pages de l'application détectées ;
- références de navigation vers pages inexistantes : aucune ;
- recherche `PIN` / `code entreprise` dans `public` et `src` : aucune occurrence ;
- aucun lien public vers `admin.html` sur l'accueil ;
- tarif serveur : 799 centimes ;
- essai serveur : 14 jours ;
- scripts/migrations présents ;
- workflow GitHub avec PostgreSQL + smoke test présent.

## Tests d'intégration

Le runtime complet Node/PostgreSQL/Stripe n'a pas pu être lancé dans l'environnement de génération car les dépendances npm n'étaient pas installées et l'accès réseau npm était indisponible/instable.

La CI incluse installe les dépendances, démarre PostgreSQL, exécute les migrations, crée le super-admin, démarre le serveur puis lance `npm run test:smoke`.

## Smoke test inclus

Le scénario vérifie notamment :

- `/health` ;
- création d'une entreprise ;
- activation immédiate de l'essai ;
- onboarding 1 à 5 ;
- tableau Aujourd'hui ;
- actions quotidiennes ;
- absence de PIN et de code entreprise dans la page de connexion.

## Validation obligatoire avant ouverture commerciale

- CI GitHub verte ;
- test Railway de bout en bout ;
- webhook Stripe en mode test ;
- restauration d'une sauvegarde PostgreSQL ;
- test S3 ;
- test SMTP ;
- test responsive sur appareils réels ;
- revue juridique et sécurité finale.
