-- HygieSafe v6.5.1 — tarif standard 9,99 € et UX admin
ALTER TABLE organizations ALTER COLUMN monthly_amount_cents SET DEFAULT 999;
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.5.1';

-- Les espaces qui n'ont pas encore d'abonnement Stripe utilisent le nouveau tarif.
-- Les abonnements Stripe déjà actifs gardent leur montant réellement souscrit.
UPDATE organizations
SET monthly_amount_cents = 999
WHERE stripe_subscription_id IS NULL
  AND status <> 'deleted';

UPDATE organizations SET app_version='6.5.1' WHERE status <> 'deleted';
