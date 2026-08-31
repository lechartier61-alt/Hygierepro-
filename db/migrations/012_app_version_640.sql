-- HygieSafe v6.4.0 — rebranding HygiePro -> HygieSafe
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.4.0';
UPDATE organizations SET app_version='6.4.0' WHERE app_version='6.3.5';
