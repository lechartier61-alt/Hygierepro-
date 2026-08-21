-- HygieSafe v6.4.4 — domaine officiel + informations juridiques
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.4.4';
UPDATE organizations SET app_version='6.4.4' WHERE app_version='6.4.3';

UPDATE site_settings
SET legal = jsonb_build_object(
  'companyName','LIVRICI SOLUTIONS SAS',
  'form','SAS — société par actions simplifiée',
  'capital','2,00 €',
  'siren','100 815 471',
  'siret','100 815 471 00014',
  'rcs','100 815 471 RCS Vannes',
  'rne','SIREN 100 815 471',
  'vat','FR37100815471',
  'naf','6201Z — Programmation informatique',
  'address','5 Rue des Tulipiers — Lot 4 ZAC des Hameaux Verts — 56250 La Vraie-Croix, France',
  'publisher','Emerick Lechartier, Président',
  'hostName','Railway Corporation',
  'hostAddress','548 Market St PMB 68956, San Francisco, California 94104, États-Unis',
  'hostPhone','+1 415 707 7675'
) || COALESCE(legal,'{}'::jsonb),
updated_at=now()
WHERE id=1;
