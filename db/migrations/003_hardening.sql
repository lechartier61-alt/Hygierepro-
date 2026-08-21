CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_email_lower ON admin_users(lower(email));
CREATE TABLE IF NOT EXISTS system_incidents (
  id bigserial PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'error',
  route text,
  method text,
  message text NOT NULL,
  stack_hash text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incidents_open ON system_incidents(created_at DESC) WHERE resolved_at IS NULL;
