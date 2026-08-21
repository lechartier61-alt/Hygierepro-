# Stripe — HygieSafe v6.3.0

Variables :
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY=eur`

Webhook : `/api/billing/webhook`.

La v6.3.0 :
- vérifie la signature Stripe sur le corps brut ;
- enregistre l’ID d’événement pour éviter un traitement multiple ;
- utilise des clés d’idempotence lors de créations sensibles ;
- limite une entreprise à un Checkout en cours ;
- réserve atomiquement les codes promo limités ;
- ne confirme la consommation d’un code promo qu’après `checkout.session.completed` ;
- libère les verrous à `checkout.session.expired` ;
- bloque la suppression d’une entreprise si l’annulation de son abonnement Stripe échoue.

Toujours valider ce flux en **mode test** avant de passer aux clés live.
