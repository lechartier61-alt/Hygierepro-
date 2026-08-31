-- HygieSafe v6.7.1 — préférences utilisateur et paramètres personnels
ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_preferences jsonb NOT NULL DEFAULT '{"conciseMode":true,"showAdvancedMenu":false,"startPage":"auto","reduceMotion":false,"largeText":false}'::jsonb;

UPDATE users
SET ui_preferences = '{"conciseMode":true,"showAdvancedMenu":false,"startPage":"auto","reduceMotion":false,"largeText":false}'::jsonb || COALESCE(ui_preferences,'{}'::jsonb);


ALTER TABLE site_settings ALTER COLUMN hero_title SET DEFAULT 'Votre hygiène HACCP, simplement.';
ALTER TABLE site_settings ALTER COLUMN hero_subtitle SET DEFAULT 'Scannez. Contrôlez. Organisez votre équipe.';
UPDATE site_settings SET hero_title='Votre hygiène HACCP, simplement.' WHERE hero_title='La journée de votre équipe, guidée et traçable.';
UPDATE site_settings SET hero_subtitle='Scannez. Contrôlez. Organisez votre équipe.' WHERE hero_subtitle IN ('Contrôles, températures, DLC et traçabilité depuis votre téléphone.','Préparez le travail, faites les contrôles au bon moment, scannez les étiquettes et conservez les preuves dans un seul espace.');

ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.7.1';
UPDATE organizations SET app_version='6.7.1' WHERE status <> 'deleted';
