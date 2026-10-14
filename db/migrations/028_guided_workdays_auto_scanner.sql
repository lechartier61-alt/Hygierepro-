-- HygieSafe v6.6.0 — Scanner automatique + Journées guidées employés

CREATE TABLE IF NOT EXISTS workday_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  title text NOT NULL DEFAULT 'Journée de travail',
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('draft','ready','in_progress','completed','cancelled')),
  planned_start_time time,
  manager_note text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,employee_id,work_date)
);
CREATE INDEX IF NOT EXISTS idx_workday_plans_org_date ON workday_plans(organization_id,work_date,status);
CREATE INDEX IF NOT EXISTS idx_workday_plans_employee ON workday_plans(employee_id,work_date DESC);

CREATE TABLE IF NOT EXISTS workday_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES workday_plans(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 1 CHECK (sort_order BETWEEN 1 AND 500),
  title text NOT NULL,
  instructions text,
  category text NOT NULL DEFAULT 'production' CHECK (category IN ('start_day','production','temperature','cleaning','traceability','scanner','reception','instruction','break','other')),
  target_quantity numeric(12,3),
  target_unit text,
  planned_minutes integer NOT NULL DEFAULT 15 CHECK (planned_minutes BETWEEN 1 AND 720),
  reference_media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  proof_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','done','skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  completion_note text,
  proof_media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  linked_record_id uuid REFERENCES records(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id,sort_order)
);
CREATE INDEX IF NOT EXISTS idx_workday_steps_plan ON workday_steps(plan_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_workday_steps_active ON workday_steps(organization_id,status,started_at);

CREATE TABLE IF NOT EXISTS workday_events (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES workday_plans(id) ON DELETE CASCADE,
  step_id uuid REFERENCES workday_steps(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workday_events_plan ON workday_events(plan_id,created_at);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_workday_plans_touch') THEN
    CREATE TRIGGER trg_workday_plans_touch BEFORE UPDATE ON workday_plans FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_workday_steps_touch') THEN
    CREATE TRIGGER trg_workday_steps_touch BEFORE UPDATE ON workday_steps FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;



-- Sépare les fiches validées par l'établissement des données détaillées issues de bases externes.
-- Les détails Open Food Facts / UPCitemdb restent dans le cache externe avec leur provenance/licence.
UPDATE organization_product_memory
SET source_data = jsonb_strip_nulls(jsonb_build_object(
      'externalSource', source,
      'sourceLabel', source_data->>'sourceLabel',
      'sourceUrl', source_url,
      'sourceLicense', source_license,
      'sourceAttribution', source_data->>'sourceAttribution',
      'validatedByUser', true
    )),
    source = 'user_validated',
    brand = NULL,
    category = NULL,
    quantity_label = NULL,
    image_url = NULL
WHERE source IN ('open_food_facts','upcitemdb');

ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.6.0';
UPDATE organizations SET app_version='6.6.0' WHERE status <> 'deleted';
