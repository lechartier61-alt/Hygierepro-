-- HygieSafe v6.8.0 — Pilotage HACCP intelligent

CREATE TABLE IF NOT EXISTS organization_networks (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  primary_organization_id uuid REFERENCES organizations(id) ON DELETE RESTRICT,
  billing_organization_id uuid REFERENCES organizations(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS network_id uuid REFERENCES organization_networks(id) ON DELETE RESTRICT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

INSERT INTO organization_networks(id,name,primary_organization_id,billing_organization_id)
SELECT o.id,o.name,o.id,o.id FROM organizations o
ON CONFLICT(id) DO NOTHING;
UPDATE organizations SET network_id=id WHERE network_id IS NULL;

CREATE TABLE IF NOT EXISTS organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','manager','employee')),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON organization_memberships(user_id,active,organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON organization_memberships(organization_id,active,role);
INSERT INTO organization_memberships(organization_id,user_id,role,active)
SELECT organization_id,id,role,active FROM users
ON CONFLICT(organization_id,user_id) DO UPDATE SET role=EXCLUDED.role,active=EXCLUDED.active;

CREATE TABLE IF NOT EXISTS corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('record','equipment','workday','sensor','manual')),
  source_id text,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  category text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  instruction text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','dismissed')),
  resolution text,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  due_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_open ON corrective_actions(organization_id,status,severity,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_corrective_source_open_unique ON corrective_actions(organization_id,source_type,source_id,category) WHERE status IN ('open','in_progress') AND source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  category text,
  yield_quantity numeric(12,3),
  yield_unit text,
  instructions text,
  allergens text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,code)
);
CREATE INDEX IF NOT EXISTS idx_recipes_org ON recipes(organization_id,active,name);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  source_record_id uuid REFERENCES records(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric(12,3),
  unit text,
  allergen_info text,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id,sort_order);

CREATE TABLE IF NOT EXISTS production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  batch_code text NOT NULL,
  product_name text NOT NULL,
  produced_quantity numeric(12,3),
  unit text,
  produced_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','consumed','withdrawn','discarded')),
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,batch_code)
);
CREATE INDEX IF NOT EXISTS idx_production_batches_org ON production_batches(organization_id,produced_at DESC,status);

CREATE TABLE IF NOT EXISTS production_batch_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  production_batch_id uuid NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  source_record_id uuid REFERENCES records(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  supplier_lot text,
  quantity numeric(12,3),
  unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_batch_inputs_batch ON production_batch_inputs(production_batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_inputs_lot ON production_batch_inputs(organization_id,supplier_lot) WHERE supplier_lot IS NOT NULL;

CREATE TABLE IF NOT EXISTS secondary_shelf_life_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('opening','preparation','thawing','production')),
  duration_hours integer NOT NULL CHECK (duration_hours BETWEEN 1 AND 8760),
  storage_note text,
  label_prefix text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shelf_rules_org ON secondary_shelf_life_rules(organization_id,active,name);

CREATE TABLE IF NOT EXISTS product_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES secondary_shelf_life_rules(id) ON DELETE SET NULL,
  source_record_id uuid REFERENCES records(id) ON DELETE SET NULL,
  production_batch_id uuid REFERENCES production_batches(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  batch_code text,
  prepared_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  storage_note text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_labels_org ON product_labels(organization_id,expires_at DESC);

CREATE TABLE IF NOT EXISTS sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id uuid REFERENCES records(id) ON DELETE SET NULL,
  name text NOT NULL,
  sensor_type text NOT NULL DEFAULT 'temperature' CHECK (sensor_type IN ('temperature','humidity')),
  token_hash text NOT NULL UNIQUE,
  threshold_min numeric(12,3),
  threshold_max numeric(12,3),
  unit text NOT NULL DEFAULT 'C',
  active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','online','offline','alert','disabled')),
  last_seen_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sensors_org ON sensors(organization_id,active,status);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sensor_id uuid NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  value numeric(12,3) NOT NULL,
  unit text NOT NULL DEFAULT 'C',
  recorded_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(sensor_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor ON sensor_readings(sensor_id,recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_org ON sensor_readings(organization_id,recorded_at DESC);

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  notification_type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  dedupe_key text,
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(organization_id,user_id,status,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_dedupe ON user_notifications(organization_id,COALESCE(user_id,'00000000-0000-0000-0000-000000000000'::uuid),dedupe_key) WHERE dedupe_key IS NOT NULL AND status='unread';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_network_touch') THEN
    CREATE TRIGGER trg_network_touch BEFORE UPDATE ON organization_networks FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_membership_touch') THEN
    CREATE TRIGGER trg_membership_touch BEFORE UPDATE ON organization_memberships FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_corrective_touch') THEN
    CREATE TRIGGER trg_corrective_touch BEFORE UPDATE ON corrective_actions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_recipe_touch') THEN
    CREATE TRIGGER trg_recipe_touch BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_batch_touch') THEN
    CREATE TRIGGER trg_batch_touch BEFORE UPDATE ON production_batches FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_shelf_rule_touch') THEN
    CREATE TRIGGER trg_shelf_rule_touch BEFORE UPDATE ON secondary_shelf_life_rules FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_sensor_touch') THEN
    CREATE TRIGGER trg_sensor_touch BEFORE UPDATE ON sensors FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;

ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.8.0';
UPDATE organizations SET app_version='6.8.0' WHERE status <> 'deleted';
