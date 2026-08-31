-- HygiePro v6.3.5 — accueil mobile : logo seul + navigation intelligente
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.3.5';
UPDATE organizations SET app_version='6.3.5' WHERE app_version='6.3.4';
