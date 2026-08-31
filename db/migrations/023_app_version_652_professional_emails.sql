-- HygieSafe v6.5.2 — identité e-mail professionnelle
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.5.2';
UPDATE organizations SET app_version='6.5.2' WHERE status <> 'deleted';
