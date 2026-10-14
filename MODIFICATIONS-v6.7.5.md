# HygieSafe v6.7.5 — Accueil Premium + Audit comptes

## Accueil public

- Refonte complète du hero en composition 2 colonnes.
- Ajout d'un aperçu visuel du produit à droite afin de supprimer l'effet de page vide.
- CTA principal et secondaire reconstruits.
- Conditions d'essai regroupées en ligne de confiance courte.
- Barre d'onglets `Aperçu / Journées / Scanner / HACCP / Équipe / Tarif` reconstruite en capsules premium.
- États actif, survol, focus clavier et navigation aux flèches.
- Contenu des onglets raccourci et davantage visuel.
- Ajout d'un CTA final compact.
- Responsive tablette/mobile dédié.
- Respect de `prefers-reduced-motion`.

## Correction du bug visuel constaté sur l'accueil

Le Service Worker pouvait retourner une ancienne version de `main.css` alors qu'un nouvel `index.html` était déjà chargé. Le résultat pouvait être un mélange de versions : hero moderne mais boutons d'onglets rendus avec le style HTML natif.

Correctifs :

- nouvelle feuille dédiée `/css/landing-v675.css` ;
- cache-busting `?v=6.7.5` sur CSS/JS ;
- cache PWA `hygiesafe-v6.7.5-shell` ;
- stratégie network-first pour CSS/JS ;
- images conservées en cache-first.

## Audit des comptes

Ajout de `scripts/test-v675-role-accounts.js` couvrant statiquement :

- Gérant ;
- Responsable ;
- Employé ;
- Admin HygieSafe ;
- isolation des organisations ;
- séparation sessions utilisateur/admin ;
- droits facturation, sauvegardes, équipe, fournisseurs, équipements, journées et médias.

Résultat : **38/38 contrôles rôles**.

## Tests accueil

Ajout de `scripts/test-v675-home-premium.js`.

Résultat : **30/30 contrôles accueil premium**.
