-- HygieSafe v6.5.4 — scanner intelligent
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.5.4';
UPDATE organizations SET app_version='6.5.4' WHERE status <> 'deleted';
