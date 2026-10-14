# HygieSafe v6.3.4 — Correctif crash sauvegarde ZIP

- Corrige le crash Node.js 22 / Railway avec `archiver` 8.0.0.
- Remplace l'ancien import par l'API ESM v8 `ZipArchive`.
- Ajoute un test d'intégration qui génère réellement un fichier ZIP en mémoire.
- Ajoute la migration `010_app_version_634.sql`.
- Aucun changement de schéma métier : les migrations 007, 008 et 009 déjà appliquées restent valides.
