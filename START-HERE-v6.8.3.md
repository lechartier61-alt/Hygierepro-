# START HERE — HygieSafe v6.8.3

## Déploiement Railway

1. Déployer tout le contenu de l'archive.
2. Garder PostgreSQL dans le même projet et le même environnement Railway.
3. `DATABASE_URL` doit rester une Reference Variable Railway valide, par exemple si le service s'appelle `Postgres` :

`${{Postgres.DATABASE_URL}}`

4. Railway exécute `npm run migrate`. La v6.8.3 n'ajoute pas de migration : la dernière reste `035_scanner_dlc_product_link_v682.sql`.
5. Vérifier `/health` :
   - `ok: true`
   - `service: HygieSafe`
   - `version: 6.8.3`

## Test installation PWA

### Android / Chrome et PC Chrome / Edge

1. ouvrir HygieSafe en HTTPS ;
2. se connecter ;
3. ouvrir **Paramètres** ;
4. cliquer **Installer HygieSafe** ;
5. accepter l'installation ;
6. vérifier que l'icône HygieSafe apparaît sur l'écran d'accueil / le bureau et que l'application s'ouvre en fenêtre autonome.

### iPhone / iPad

1. ouvrir HygieSafe dans Safari ;
2. **Paramètres → Installer HygieSafe → Comment faire ?** ;
3. suivre **Partager → Sur l'écran d'accueil → Ajouter**.

## Test inscription

1. depuis l'accueil public, cliquer **Essayer gratuitement** ;
2. vérifier la notification expliquant qu'HygieSafe peut être installée comme une application ;
3. créer un compte ;
4. après vérification e-mail et onboarding, vérifier qu'un rappel d'installation non bloquant est proposé ;
5. choisir **Plus tard** et vérifier que le rappel disparaît ; l'installation reste toujours accessible depuis Paramètres.

## Important

L'installation PWA nécessite HTTPS. Railway et `hygiesafe.com` remplissent cette condition lorsqu'ils sont correctement configurés.
