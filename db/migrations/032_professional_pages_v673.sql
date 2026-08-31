-- HygieSafe v6.7.3 — refonte professionnelle de toutes les pages
-- Aucune modification de structure : synchronisation de la version applicative.
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.7.3';
UPDATE organizations SET app_version='6.7.3' WHERE status <> 'deleted';
