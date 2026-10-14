# Checklist de mise en production — HygieSafe v6.7.3

## Déploiement

- [ ] `DATABASE_URL` référence bien le service PostgreSQL Railway.
- [ ] `npm install` a généré un vrai `package-lock.json`, ensuite versionné dans Git.
- [ ] Les builds suivants utilisent `npm ci` dès que le lockfile est disponible.
- [ ] `npm run migrate` applique jusqu'à `032_professional_pages_v673.sql`.
- [ ] `APP_URL` et `PUBLIC_SITE_URL` utilisent le domaine HTTPS final.
- [ ] Le stockage médias utilise S3 ou un volume Railway persistant.
- [ ] Resend est testé sur vérification d'e-mail, invitation et mot de passe oublié.
- [ ] Stripe est testé avec Automatic Tax et les webhooks de production.

## Validation interface v6.7.3

- [ ] Compte Gérant testé sur ordinateur et mobile.
- [ ] Compte Responsable testé sur ordinateur et mobile.
- [ ] Compte Employé testé sur ordinateur et mobile.
- [ ] Compte Admin HygieSafe testé sur ordinateur et mobile.
- [ ] Contrôles : filtres, recherche et création d'un relevé.
- [ ] Scanner : caméra, galerie, série et réception.
- [ ] Traçabilité : recherche et indicateurs DLC.
- [ ] Inventaire : stocks faibles et ruptures.
- [ ] Fournisseurs : besoins, fournisseurs et historique.
- [ ] Journées équipe : recherche, planification et détail.
- [ ] Équipe : invitation, horaires et planification.
- [ ] Rapports : PDF, CSV et sauvegarde ZIP.
- [ ] Paramètres : tutoriel relançable et préférences.
- [ ] PWA : vérifier qu'un ancien appareil charge le cache v6.7.3.

## Informations légales encore à valider avant commercialisation

- [ ] e-mail professionnel LIVRICI ;
- [ ] téléphone professionnel LIVRICI ;
- [ ] directeur de publication ;
- [ ] contact RGPD réellement suivi ;
- [ ] DPA et liste des sous-traitants à jour ;
- [ ] plateforme agréée de facturation électronique choisie selon le calendrier légal applicable.
