-- HygieSafe v6.7.0 — fiabilité preuves, journées modifiables, consentements juridiques

ALTER TABLE workday_steps ADD COLUMN IF NOT EXISTS actual_quantity numeric(12,3);
ALTER TABLE workday_steps ADD COLUMN IF NOT EXISTS blocked_at timestamptz;
ALTER TABLE workday_steps ADD COLUMN IF NOT EXISTS block_reason text;
ALTER TABLE workday_steps ADD COLUMN IF NOT EXISTS block_note text;
ALTER TABLE workday_steps ADD COLUMN IF NOT EXISTS block_media_id uuid REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE workday_steps ADD COLUMN IF NOT EXISTS blocked_by uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workday_steps_blocked ON workday_steps(organization_id,blocked_at) WHERE blocked_at IS NOT NULL;

-- La v6.6.0 permettait techniquement de rattacher le même relevé à plusieurs étapes.
-- Avant de poser l'unicité, on conserve le rattachement le plus ancien et on historise
-- les doublons retirés afin qu'une base existante ne fasse pas échouer la migration.
WITH duplicate_links AS (
  SELECT id, organization_id, plan_id, linked_record_id,
         row_number() OVER (
           PARTITION BY linked_record_id
           ORDER BY completed_at NULLS LAST, created_at, id
         ) AS rn
  FROM workday_steps
  WHERE linked_record_id IS NOT NULL
), logged AS (
  INSERT INTO workday_events(organization_id,plan_id,step_id,event_type,payload)
  SELECT organization_id,plan_id,id,'linked_record_deduplicated',
         jsonb_build_object('linkedRecordId',linked_record_id,'reason','migration_v670_duplicate')
  FROM duplicate_links WHERE rn>1
  RETURNING step_id
)
UPDATE workday_steps s
SET linked_record_id=NULL
FROM duplicate_links d
WHERE s.id=d.id AND d.rn>1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workday_steps_linked_record_unique ON workday_steps(linked_record_id) WHERE linked_record_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS record_revisions (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  revision_type text NOT NULL CHECK (revision_type IN ('update','void')),
  previous_data jsonb NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_record_revisions_record ON record_revisions(organization_id,record_id,created_at DESC);

CREATE TABLE IF NOT EXISTS legal_acceptances (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('cgv','cgu','dpa','privacy')),
  document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  user_agent text,
  UNIQUE(user_id,document_type,document_version)
);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_org ON legal_acceptances(organization_id,accepted_at DESC);

ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.7.0';
UPDATE organizations SET app_version='6.7.0' WHERE status <> 'deleted';
