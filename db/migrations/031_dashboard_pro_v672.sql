-- HygieSafe v6.7.2 — tableaux de bord professionnels
-- Aucune modification de structure : synchronisation de la version applicative.
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.7.2';
UPDATE organizations SET app_version='6.7.2' WHERE status <> 'deleted';
