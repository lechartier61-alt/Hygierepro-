# Audit général LGY.fr V6.5

## Côté utilisateur — corrections appliquées

- création de compte avec confirmation du mot de passe ;
- acceptation de la politique de confidentialité vérifiée par le serveur ;
- blocage du double envoi pendant la connexion et l’inscription ;
- formulaires du profil et des adresses mieux étiquetés pour l’accessibilité ;
- préremplissage de la commande avec les données du client connecté ;
- historique des commandes détaillé ;
- affichage du statut de paiement, du retrait/livraison et des articles ;
- fonction « Recommander » avec contrôle de la disponibilité actuelle ;
- états vides et messages d’erreur conservés ;
- amélioration responsive de l’espace client.

## Côté administration — corrections appliquées

- la liste Clients affiche désormais les vrais comptes enregistrés ;
- les clients ayant commandé sans compte restent visibles ;
- distinction entre compte actif, compte désactivé et commande invitée ;
- filtrage des clients par type ;
- nombre d’adresses, commandes, total dépensé et dernière activité ;
- activation et désactivation d’un compte client depuis l’administration ;
- journalisation des changements de statut client ;
- tableau client enrichi et responsive.

## Sécurité et déploiement

- suppression des secrets générés du ZIP ;
- conservation des exclusions `.gitignore` ;
- validation serveur de l’acceptation de confidentialité ;
- version du cache PWA incrémentée ;
- script `npm run check` ajouté.

## Limites restant avant une exploitation commerciale complète

- stockage JSON à remplacer par PostgreSQL ;
- paiement Stripe réel et webhooks ;
- récupération de mot de passe par e-mail ;
- confirmation d’adresse e-mail ;
- sauvegardes externes ;
- envoi d’e-mails transactionnels ;
- rôles administrateurs et double authentification.
