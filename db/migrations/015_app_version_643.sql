-- HygieSafe v6.4.3 — robustesse Railway / Resend
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.4.3';
UPDATE organizations SET app_version='6.4.3' WHERE app_version='6.4.2';
