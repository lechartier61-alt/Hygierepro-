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

## v6.6.1 — TVA B2B avant production

HygieSafe affiche désormais le tarif standard à **9,99 € HT / mois / entreprise**.

Configuration production attendue :

- activer **Stripe Tax / Automatic Tax** dans le Dashboard Stripe ;
- `STRIPE_AUTOMATIC_TAX=true` ;
- `STRIPE_PRICE_TAX_BEHAVIOR=exclusive` ;
- Checkout collecte obligatoirement l'adresse de facturation ;
- Checkout propose la collecte du numéro de TVA du client ;
- l'adresse et le nom saisis sont enregistrés sur le Customer Stripe ;
- vérifier en mode test une société française assujettie, une société UE avec TVA valide et un cas hors UE avant passage en live.

Le calcul Stripe ne dispense pas LIVRICI de vérifier les mentions obligatoires de ses factures ni de mettre en place la facturation électronique française selon son calendrier légal.
