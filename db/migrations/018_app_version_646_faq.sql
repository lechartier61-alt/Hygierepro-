-- HygieSafe v6.4.6 — page FAQ dédiée
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.4.6';
UPDATE organizations SET app_version='6.4.6' WHERE app_version='6.4.5';
