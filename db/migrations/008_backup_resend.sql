-- HygiePro v6.3.2 — sauvegarde ZIP complète + Resend
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.3.2';
UPDATE organizations SET app_version='6.3.2' WHERE app_version IN ('6.3.0','6.3.1');
