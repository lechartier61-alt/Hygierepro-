# Résultats de tests — HygieSafe v6.7.5

Date de préparation : 25 août 2026.

## Résultat global exécutable dans l'environnement d'audit

- **23 suites de tests exécutées avec succès**.
- **492 contrôles/scénarios validés** au total dans ces suites.
- Vérification de syntaxe JavaScript : OK.
- Parsing HTML accueil : OK, aucun ID dupliqué.
- Accolades CSS `landing-v675.css` : 231 / 231, OK.

## Tests par zone

- Parcours utilisateur : 24/24.
- Sécurité : 10/10.
- Scanner terrain : 8/8.
- Scanner UX : 13/13.
- Scanner Pro : 17/17.
- Recherche produits : 15/15.
- Journées guidées / Scanner auto v6.6.0 : 26/26.
- Production v6.7.x : 29/29.
- Paramètres / accueil v6.7.1 : 18/18.
- Dashboards Pro v6.7.2 : 20/20.
- Interface Pro v6.7.3 : 30/30.
- Équipements Pro v6.7.4 : 30/30.
- Accueil Premium v6.7.5 : 30/30.
- Comptes & rôles v6.7.5 : 38/38.
- Températures programmées : 6/6.
- Tutoriels par rôle : 12/12.
- Admin observabilité : 20/20.
- Admin bootstrap : 8/8.
- Admin UX / tarif : 10/10 scénarios.
- Facture → commandes : 3/3 scénarios.
- Inscription SQL : 3/3.
- Railway / Resend : 8/8.

Le script global `check.js` valide en plus la syntaxe et la présence des ressources, migrations, pages et parseurs attendus.

## Deux tests runtime non exécutables ici

Ces deux cas ne sont **pas déclarés réussis** :

1. `test-professional-emails.js` nécessite les dépendances npm (`dotenv`, etc.).
2. `test-backup.js` nécessite notamment `archiver`.

L'archive source ne contient toujours pas `node_modules` ni `package-lock.json`, et l'installation npm a expiré dans l'environnement d'audit.

À rejouer après :

```bash
npm install
npm run test:backup
node scripts/test-professional-emails.js
```

Puis conserver le `package-lock.json` généré et utiliser `npm ci` dans les builds suivants.

## Limite importante

La majorité de ces tests sont des tests statiques/régressions de code. Ils couvrent bien les protections et les parcours prévus, mais ne remplacent pas un véritable test E2E avec :

- PostgreSQL réel ;
- navigateur ;
- quatre comptes de test ;
- Stripe test ;
- Resend test ;
- uploads réels ;
- coupures réseau ;
- appareil mobile réel.
