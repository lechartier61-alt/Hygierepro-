CREATE TABLE IF NOT EXISTS supplier_invoice_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  source_media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  invoice_number text,
  invoice_date date,
  total_ht_cents integer CHECK (total_ht_cents IS NULL OR total_ht_cents >= 0),
  total_ttc_cents integer CHECK (total_ttc_cents IS NULL OR total_ttc_cents >= 0),
  ocr_confidence integer CHECK (ocr_confidence IS NULL OR (ocr_confidence BETWEEN 0 AND 100)),
  imported_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_imports_org ON supplier_invoice_imports(organization_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_imports_supplier ON supplier_invoice_imports(organization_id,supplier_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_invoice_imports_invoice_no
  ON supplier_invoice_imports(organization_id,supplier_id,invoice_number)
  WHERE invoice_number IS NOT NULL AND btrim(invoice_number)<>'';

CREATE TABLE IF NOT EXISTS supplier_invoice_import_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES supplier_invoice_imports(id) ON DELETE CASCADE,
  stock_article_id uuid REFERENCES records(id) ON DELETE SET NULL,
  supplier_product_id uuid REFERENCES supplier_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  supplier_reference text,
  invoice_quantity numeric(12,3) CHECK (invoice_quantity IS NULL OR invoice_quantity > 0),
  order_unit text NOT NULL DEFAULT 'unité',
  unit_price_cents integer CHECK (unit_price_cents IS NULL OR unit_price_cents >= 0),
  line_total_cents integer CHECK (line_total_cents IS NULL OR line_total_cents >= 0),
  raw_text text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_import_lines_import ON supplier_invoice_import_lines(import_id,sort_order);
