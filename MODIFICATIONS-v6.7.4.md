# HygieSafe v6.7.4 — Équipements Pro

Cette version reprend entièrement le module **Gérant / Responsable → Équipements** et corrige plusieurs défauts de l'ancien fonctionnement générique.

## Nouveau parc matériel

Chaque équipement possède désormais une fiche dédiée avec :

- nom, type et emplacement ;
- marque, modèle et numéro de série ;
- photo ;
- état métier : opérationnel, en maintenance ou hors service ;
- équipement critique ;
- seuils de température lorsqu'ils sont pertinents ;
- date d'achat et fin de garantie ;
- fréquence et prochaine date de maintenance ;
- notes internes ;
- dernière température connue ;
- historique technique.

## Maintenance et pannes

La fiche permet de :

- enregistrer ou planifier une maintenance ;
- signaler une panne ;
- joindre une photo ou un PDF ;
- enregistrer l'intervenant et le coût ;
- créer automatiquement une non-conformité lors d'une panne si nécessaire ;
- remettre un équipement en service après réparation ;
- enregistrer un contrôle technique ou une note ;
- conserver l'historique des événements dans la sauvegarde de l'établissement.

Un équipement hors service ou en maintenance n'est plus proposé dans les contrôles de température programmés.

## Corrections de bugs

- suppression du menu générique **« Marquer terminé »** sur les équipements ;
- un équipement ne peut plus être supprimé physiquement via l'API générique : il doit être archivé afin de conserver son historique ;
- les friteuses et matériels sans seuil de température ne sont plus proposés pour un relevé froid ;
- une valeur de seuil vide n'est plus interprétée comme `0 °C` ;
- un message clair apparaît lorsqu'aucun équipement contrôlé par température n'est configuré ;
- correction de la jointure `record_revisions.actor_user_id` dans la sauvegarde complète.

## Pilotage

Le tableau de bord Gérant/Responsable remonte maintenant :

- les équipements en panne ou en maintenance ;
- les maintenances arrivant à échéance dans les 7 jours.

## QR et fiche PDF

Chaque équipement possède :

- un QR code ouvrant directement sa fiche HygieSafe ;
- une fiche PDF récapitulative avec identification, seuils, températures et historique technique.

## Base de données

Nouvelle migration :

`033_equipment_pro_v674.sql`

Elle crée `equipment_events` et passe la version établissement à `6.7.4`.
