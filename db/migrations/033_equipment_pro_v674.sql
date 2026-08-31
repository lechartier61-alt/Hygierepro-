-- HygieSafe v6.7.4 — parc équipements professionnel

CREATE TABLE IF NOT EXISTS equipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('maintenance','breakdown','repair','inspection','cleaning','note')),
  status text NOT NULL DEFAULT 'done' CHECK (status IN ('open','pending','done','cancelled')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  title text,
  description text,
  technician text,
  cost_cents integer CHECK (cost_cents IS NULL OR cost_cents >= 0),
  due_at date,
  performed_at timestamptz NOT NULL DEFAULT now(),
  media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_equipment_events_equipment ON equipment_events(organization_id,equipment_id,performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_events_open ON equipment_events(organization_id,status,event_type) WHERE status IN ('open','pending');

-- Les anciens équipements restent compatibles, mais acquièrent un état métier distinct du statut du record.
UPDATE records
SET payload = COALESCE(payload,'{}'::jsonb) || jsonb_build_object('condition',COALESCE(NULLIF(payload->>'condition',''),'operational'))
WHERE type='equipment' AND NOT (payload ? 'condition');

ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.7.4';
UPDATE organizations SET app_version='6.7.4' WHERE status <> 'deleted';
