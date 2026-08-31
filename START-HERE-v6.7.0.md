# START HERE — HygieSafe v6.7.0

La version contient les correctifs sécurité/journées, le nouveau tutoriel, le nouvel accueil, le cadrage juridique B2B/RGPD et la préparation Stripe/TVA.

## Avant de mettre le service commercialement en ligne
1. Renseigner `LEGAL_EMAIL`, `LEGAL_PHONE`, `LEGAL_PRIVACY_EMAIL`, `LEGAL_PUBLISHER`.
2. Exécuter `npm install`, conserver le `package-lock.json`, puis relancer `npm test` avec PostgreSQL.
3. Activer/tester Stripe Tax et les informations fiscales réelles du compte Stripe.
4. Tester une restauration complète de sauvegarde.
5. Mettre en place la plateforme agréée / le circuit de facturation électronique et les procédures RGPD internes de LIVRICI.

## Ordre recommandé
```bash
npm install
npm run migrate
npm run check
npm run test:v670
npm test
npm start
```

Consulter ensuite :
- `PRODUCTION-CHECKLIST-v6.7.0.md`
- `REGLEMENTATION-FRANCE-2026.md`
- `TEST-RESULTS-v6.7.0.md`
- `DEPLOIEMENT-RAILWAY.md`
