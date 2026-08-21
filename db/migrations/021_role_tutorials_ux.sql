-- HygieSafe v6.5.0 — tutoriels par rôle et suivi de prise en main
ALTER TABLE users ADD COLUMN IF NOT EXISTS ux_tutorial_version integer NOT NULL DEFAULT 0;
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.5.0';
UPDATE organizations SET app_version='6.5.0' WHERE app_version IN ('6.4.8','6.4.9');
