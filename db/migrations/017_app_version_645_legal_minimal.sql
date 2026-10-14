-- HygieSafe v6.4.5 — mentions juridiques simplifiées
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.4.5';
UPDATE organizations SET app_version='6.4.5' WHERE app_version='6.4.4';
