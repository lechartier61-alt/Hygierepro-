-- HygieSafe v6.4.7 — horaires employés + alertes température au bon moment
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Paris';

CREATE TABLE IF NOT EXISTS employee_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  active boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, weekday),
  CHECK ((active = false) OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time))
);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_org_user ON employee_schedules(organization_id,user_id,weekday);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_employee_schedule_touch') THEN
    CREATE TRIGGER trg_employee_schedule_touch BEFORE UPDATE ON employee_schedules FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;

ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.4.7';
UPDATE organizations SET app_version='6.4.7' WHERE app_version='6.4.6';
