# HygieSafe v6.8.3 — Installation téléphone / PC (PWA)

## Objectif

Permettre aux utilisateurs d'installer HygieSafe comme une application sur téléphone, tablette ou ordinateur en attendant les versions App Store / Google Play.

## Nouveautés

- nouvelle carte **Installer HygieSafe** dans **Paramètres**, disponible pour tous les rôles ;
- installation native via le navigateur lorsque `beforeinstallprompt` est disponible (Chrome / Edge / Android compatibles) ;
- instructions adaptées à iPhone/iPad, Android, Windows et Mac lorsque l'installation doit être faite depuis le menu du navigateur ;
- détection du mode installé (`standalone`) pour ne plus proposer inutilement le bouton ;
- page d'inscription rendue installable (manifest + service worker + icône) ;
- notification discrète sur la page d'inscription pour informer qu'HygieSafe peut être installée sans store ;
- après création du compte, mémorisation d'un rappel d'installation ;
- rappel non bloquant dans l'application après onboarding / première ouverture ;
- cache PWA renouvelé en `hygiesafe-v6.8.3-shell` ;
- manifest enrichi (`id`, `scope`, langue, catégories, icônes, mode standalone) ;
- métadonnées Apple / mobile ajoutées aux principales pages publiques et d'authentification.

## Base de données

Aucune nouvelle migration SQL.

La dernière migration reste :

`035_scanner_dlc_product_link_v682.sql`

## Compatibilité

La v6.8.3 conserve intégralement le Scanner DLC v6.8.2 et les fonctions v6.8.0/v6.8.1.
