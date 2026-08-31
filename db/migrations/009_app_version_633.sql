-- HygiePro v6.3.3 — compte test client administrateur
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.3.3';
UPDATE organizations SET app_version='6.3.3' WHERE app_version='6.3.2';
