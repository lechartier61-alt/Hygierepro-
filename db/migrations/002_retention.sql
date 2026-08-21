-- Nettoyage régulier déclenché par le serveur.
-- La CNIL recommande de définir des durées adaptées à la finalité. Les pointages
-- utilisés pour le suivi du temps de travail sont configurés par défaut à 5 ans.
CREATE INDEX IF NOT EXISTS idx_records_timeclock_cleanup ON records(organization_id,occurred_at) WHERE type='timeclock';
CREATE INDEX IF NOT EXISTS idx_audit_cleanup ON audit_logs(created_at);
