-- HygieSafe v6.4.8 — centre de supervision administrateur
-- Aucune donnée métier n'est modifiée : cette migration met uniquement à jour la version applicative.
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.4.8';
UPDATE organizations SET app_version='6.4.8' WHERE app_version='6.4.7';
