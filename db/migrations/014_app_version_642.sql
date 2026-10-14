-- HygieSafe v6.4.2 — correction inscription PostgreSQL et logs 4xx
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.4.2';
UPDATE organizations SET app_version='6.4.2' WHERE app_version='6.4.1';
