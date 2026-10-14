CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  account_number text,
  allowed_order_days smallint[] NOT NULL DEFAULT ARRAY[3]::smallint[],
  cutoff_time time,
  lead_days integer NOT NULL DEFAULT 1 CHECK (lead_days BETWEEN 0 AND 30),
  minimum_order_cents integer NOT NULL DEFAULT 0 CHECK (minimum_order_cents >= 0),
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id,active,name);

CREATE TABLE IF NOT EXISTS supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stock_article_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_unit text NOT NULL DEFAULT 'unité',
  pack_size numeric(12,3) NOT NULL DEFAULT 1 CHECK (pack_size > 0),
  default_order_qty numeric(12,3) NOT NULL DEFAULT 1 CHECK (default_order_qty >= 0),
  unit_price_cents integer CHECK (unit_price_cents IS NULL OR unit_price_cents >= 0),
  supplier_reference text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, stock_article_id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(organization_id,supplier_id);

CREATE TABLE IF NOT EXISTS supplier_order_needs (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stock_article_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  quantity numeric(12,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  note text,
  ready_for_owner boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, stock_article_id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_needs_ready ON supplier_order_needs(organization_id,ready_for_owner,updated_at DESC);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','received','cancelled')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  expected_delivery_date date,
  total_estimated_cents integer NOT NULL DEFAULT 0 CHECK (total_estimated_cents >= 0),
  notes text,
  prepared_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, order_number)
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON purchase_orders(organization_id,submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(organization_id,supplier_id,submitted_at DESC);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  stock_article_id uuid REFERENCES records(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  supplier_reference text,
  order_unit text NOT NULL DEFAULT 'unité',
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  pack_size numeric(12,3) NOT NULL DEFAULT 1,
  unit_price_cents integer CHECK (unit_price_cents IS NULL OR unit_price_cents >= 0),
  current_stock numeric(12,3),
  min_stock numeric(12,3),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_order ON purchase_order_lines(order_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_suppliers_touch') THEN
    CREATE TRIGGER trg_suppliers_touch BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_supplier_products_touch') THEN
    CREATE TRIGGER trg_supplier_products_touch BEFORE UPDATE ON supplier_products FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_purchase_orders_touch') THEN
    CREATE TRIGGER trg_purchase_orders_touch BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;
