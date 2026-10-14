-- HygieSafe v6.4.1 — nouveau logo officiel
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.4.1';
UPDATE organizations SET app_version='6.4.1' WHERE app_version='6.4.0';
