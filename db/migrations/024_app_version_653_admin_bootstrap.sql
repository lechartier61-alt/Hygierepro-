-- HygieSafe v6.5.3 — initialisation sécurisée du premier administrateur
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.5.3';
UPDATE organizations SET app_version='6.5.3' WHERE status <> 'deleted';
