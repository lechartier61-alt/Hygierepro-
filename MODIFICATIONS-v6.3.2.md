# HygieSafe v6.3.2 — Sauvegarde complète + Resend

## Sauvegarde ZIP côté gérant
- Nouveau bouton dans **Mon profil → Sauvegarde & mes données**.
- Génération à la demande d'un ZIP autonome et téléchargé sur l'appareil du gérant.
- Classement `annees / AAAA / MM-mois / JJ`.
- Inclusion des contrôles et de toute la traçabilité, des photos/documents associés, factures fournisseurs, commandes, fournisseurs, besoins de commande, équipe, paramètres et journal d'activité.
- Un dossier `donnees-completes` contient également des exports JSON/CSV globaux.
- Aucun mot de passe, secret 2FA, session, clé API ou jeton sensible n'est exporté.
- Compatible stockage Railway Volume et S3 compatible.
- Génération en streaming pour éviter de construire toute l'archive en mémoire.

## Resend
- Resend devient prioritaire pour les e-mails transactionnels.
- Variables : `RESEND_API_KEY` et `RESEND_FROM`.
- Vérification e-mail, invitation équipe et mot de passe oublié utilisent automatiquement Resend si configuré.
- SMTP reste disponible en secours.
- En production, `RESEND_FROM` est obligatoire quand `RESEND_API_KEY` est défini.

## Version
- Application : 6.3.2.
- Cache PWA : `hygiepro-v6.3.2-shell`.
- Migration : `008_backup_resend.sql`.
