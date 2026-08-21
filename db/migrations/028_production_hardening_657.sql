-- HygieSafe v6.5.7 — Durcissement production
-- Les données Open Food Facts ne sont plus persistées dans le cache propriétaire :
-- elles sont consultées à la demande et affichées avec attribution ODbL.
DELETE FROM external_product_cache WHERE source IS DISTINCT FROM 'upcitemdb';
UPDATE organization_product_memory
SET brand=NULL,category=NULL,quantity_label=NULL,image_url=NULL,source='manual_confirmation',source_url=NULL,source_license=NULL,
    source_data=jsonb_build_object('migratedFromExternalSource',COALESCE(source_data->>'source',source)),updated_at=now()
WHERE source IN ('open_food_facts','upcitemdb') OR source_data->>'source' IN ('open_food_facts','upcitemdb');
ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.5.7';
UPDATE organizations SET app_version='6.5.7' WHERE status <> 'deleted';
