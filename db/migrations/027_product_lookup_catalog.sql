-- HygieSafe v6.5.6 — Base Produits Internet + mémoire locale validée
CREATE TABLE IF NOT EXISTS external_product_cache (
  barcode text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('found','not_found','error')),
  source text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  hit_count bigint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_external_product_cache_expires ON external_product_cache(expires_at);

CREATE TABLE IF NOT EXISTS organization_product_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  product_name text NOT NULL,
  brand text,
  category text,
  quantity_label text,
  image_url text,
  source text NOT NULL DEFAULT 'manual',
  source_url text,
  source_license text,
  source_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  seen_count bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,barcode)
);
CREATE INDEX IF NOT EXISTS idx_org_product_memory_barcode ON organization_product_memory(organization_id,barcode);
CREATE INDEX IF NOT EXISTS idx_org_product_memory_name ON organization_product_memory(organization_id,lower(product_name));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_org_product_memory_touch') THEN
    CREATE TRIGGER trg_org_product_memory_touch BEFORE UPDATE ON organization_product_memory FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;

ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.5.6';
UPDATE organizations SET app_version='6.5.6' WHERE status <> 'deleted';
