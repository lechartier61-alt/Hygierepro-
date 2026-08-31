# Checklist production — HygieSafe v6.7.4

## Déploiement

- [ ] `DATABASE_URL` est correctement référencé.
- [ ] `npm run migrate` applique jusqu'à `033_equipment_pro_v674.sql`.
- [ ] `APP_URL` correspond au domaine HTTPS utilisé par les QR équipements.
- [ ] stockage S3 ou Railway Volume opérationnel pour les photos et documents.
- [ ] cache PWA v6.7.4 chargé sur mobile.

## Équipements

- [ ] créer un réfrigérateur avec seuil 0 / 4 °C ;
- [ ] vérifier qu'il apparaît dans les relevés de température ;
- [ ] créer une friteuse sans seuil et vérifier qu'elle n'apparaît pas dans les relevés froids ;
- [ ] déclarer une panne et vérifier le passage **Hors service** ;
- [ ] vérifier que la panne peut créer une non-conformité ;
- [ ] vérifier que l'équipement hors service disparaît des relevés programmés ;
- [ ] enregistrer une réparation et vérifier la remise en service ;
- [ ] planifier une maintenance ;
- [ ] terminer une maintenance et vérifier la prochaine échéance ;
- [ ] joindre une photo ou un PDF à une intervention ;
- [ ] ouvrir le QR ;
- [ ] ouvrir la fiche PDF ;
- [ ] archiver puis réactiver un équipement ;
- [ ] vérifier l'historique dans la sauvegarde ZIP après installation des dépendances.

## Toujours requis avant commercialisation

- [ ] e-mail professionnel LIVRICI ;
- [ ] téléphone professionnel LIVRICI ;
- [ ] directeur de publication ;
- [ ] contact RGPD ;
- [ ] Stripe/TVA testés ;
- [ ] plateforme agréée de facturation électronique selon le calendrier applicable ;
- [ ] vrai `package-lock.json` généré et versionné.
