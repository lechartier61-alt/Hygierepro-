-- HygieSafe v6.5.5 — Scanner Pro : séries, GS1/DataMatrix et réceptions intelligentes
CREATE TABLE IF NOT EXISTS scan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('series','reception')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','cancelled')),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  invoice_import_id uuid REFERENCES supplier_invoice_imports(id) ON DELETE SET NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_org_open ON scan_sessions(organization_id,status,started_at DESC);

CREATE TABLE IF NOT EXISTS scan_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  stock_article_id uuid REFERENCES records(id) ON DELETE SET NULL,
  media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  product_name text,
  barcode text,
  gtin text,
  raw_code text,
  lot text,
  expiry_date date,
  date_type text,
  quantity numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 100000),
  anomaly_codes text[] NOT NULL DEFAULT '{}'::text[],
  duplicate_record_id uuid REFERENCES records(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scan_session_items_session ON scan_session_items(session_id,created_at);
CREATE INDEX IF NOT EXISTS idx_scan_session_items_identity ON scan_session_items(organization_id,barcode,lot,expiry_date);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_scan_sessions_touch') THEN
    CREATE TRIGGER trg_scan_sessions_touch BEFORE UPDATE ON scan_sessions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;

ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.5.5';
UPDATE organizations SET app_version='6.5.5' WHERE status <> 'deleted';
