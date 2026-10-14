-- HygieSafe v6.8.2 — Scanner DLC simplifié et apprentissage produit
CREATE TABLE IF NOT EXISTS product_scan_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stock_article_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  source text NOT NULL DEFAULT 'ocr',
  seen_count integer NOT NULL DEFAULT 1 CHECK (seen_count > 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (organization_id, normalized_alias)
);
CREATE INDEX IF NOT EXISTS idx_product_scan_aliases_article ON product_scan_aliases(organization_id,stock_article_id,last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_scan_aliases_normalized ON product_scan_aliases(organization_id,normalized_alias);
