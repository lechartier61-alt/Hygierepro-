# HygieSafe v6.4.7 — Icônes & horaires de température

## Identité visuelle
- Intégration de 10 icônes HygieSafe personnalisées dans l’application, le site public et l’administration.
- Remplacement des principaux emojis/pictogrammes génériques par la nouvelle identité vert / anthracite / blanc.
- Mise en cache PWA des nouvelles icônes.

## Horaires employés
- Nouvelle table `employee_schedules`.
- Éditeur d’horaires du lundi au dimanche depuis **Équipe** pour les comptes employés.
- Horaires de journée validés côté serveur (heure de fin strictement après l’heure de début).
- Fuseau par défaut : `Europe/Paris`.

## Températures au bon moment
- Pour les employés, les relevés ne sont plus proposés toute la journée dès l’ouverture de l’application.
- Un créneau **Arrivée** devient disponible à l’heure de début du service.
- Un créneau **Départ** devient disponible à l’heure de fin du service.
- Alerte visible sur le compte employé lorsqu’un ou plusieurs appareils doivent être relevés.
- Un relevé non fait passe en retard après 30 minutes et reste visible jusqu’à validation.
- Protection serveur contre les relevés anticipés et les doublons.
- Les gérants/responsables gardent la possibilité d’effectuer un relevé manuel.

## Sauvegarde
- Les horaires employés sont ajoutés à `donnees-completes/horaires-equipe.json` dans la sauvegarde ZIP.

## Migration
- `019_employee_temperature_schedules.sql`
