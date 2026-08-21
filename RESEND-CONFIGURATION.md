# Resend — configuration HygieSafe v6.3.2

HygieSafe utilise Resend en priorité pour :

- la vérification d'adresse e-mail après inscription ;
- les invitations des employés/responsables ;
- la réinitialisation du mot de passe.

## Variables Railway

Dans le service HygieSafe :

```text
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
RESEND_FROM=HygieSafe <noreply@votre-domaine.fr>
```

Le domaine de `RESEND_FROM` doit être un domaine que vous possédez et que vous avez validé dans Resend.

## Sécurité

- Ne jamais placer `RESEND_API_KEY` dans GitHub ou dans le code source.
- Créer de préférence une clé limitée à l'envoi d'e-mails pour la production.
- En cas de fuite, révoquer la clé immédiatement dans Resend et en créer une nouvelle.

## SMTP

Les variables SMTP sont conservées comme solution de secours. Si `RESEND_API_KEY` est défini, HygieSafe utilise Resend en priorité.


## Identité des e-mails — v6.5.2

Les e-mails transactionnels HygieSafe utilisent désormais un gabarit HTML professionnel et responsive : logo officiel, bouton principal, lien de secours, pré-en-tête, message de sécurité et version texte.

E-mails concernés : vérification d'adresse, réinitialisation du mot de passe et invitation d'un membre.

L'adresse d'envoi recommandée reste : `HygieSafe <noreply@mail.hygiesafe.com>`.
