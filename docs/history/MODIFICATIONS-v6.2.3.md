# HygiePro v6.2.3 — audit + finition connexion / inscription

## Interface
- barre publique « Connexion / Inscription » entièrement retravaillée ;
- bouton Inscription plus premium avec sous-texte « 14 jours gratuits » ;
- bouton Connexion plus léger, distinct du CTA principal ;
- états hover et focus clavier améliorés ;
- adaptation mobile dédiée ;
- pages Connexion et Inscription modernisées ;
- marque HygiePro visible sur mobile sur les pages d'authentification ;
- CTA avec flèche, hiérarchie visuelle et liens secondaires plus propres ;
- état de chargement pendant la connexion/création pour empêcher les doubles envois ;
- message spécifique quand le navigateur n'arrive pas à joindre le serveur.

## Fiabilité / sécurité corrigées
- version harmonisée en 6.2.3 dans le healthcheck, les logs, le suivi d'activité et le cache PWA ;
- nouveau cache PWA `hygiepro-v6.2.3-shell` pour éviter de garder l'ancienne interface ;
- en production, les liens de réinitialisation/invitation ne sont plus imprimés dans les logs lorsque SMTP est absent ;
- migration 005 : la version par défaut des nouvelles organisations devient 6.2.3.

## Vérifications effectuées
- syntaxe de tous les fichiers JavaScript : OK ;
- `npm run check` équivalent via `scripts/check.js` : OK ;
- scanner terrain : 5/5 scénarios OK ;
- structure HTML Connexion / Inscription / Accueil : OK ;
- accolades CSS : cohérentes.

Les tests PostgreSQL, Stripe, SMTP et Railway réels nécessitent les services et secrets de production et ne sont pas simulés dans cet audit statique.
