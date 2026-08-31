-- HygiePro v6.3.4 — correctif Archiver v8 / sauvegarde ZIP
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.3.4';
UPDATE organizations SET app_version='6.3.4' WHERE app_version='6.3.3';
