-- =========================================================
-- Admin audit log for destructive/sensitive actions
-- Run after 006. Safe to run multiple times (IF NOT EXISTS).
-- =========================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id
  ON public.admin_audit_log(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity
  ON public.admin_audit_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON public.admin_audit_log(created_at DESC);

COMMENT ON TABLE public.admin_audit_log IS 'Audit trail for admin actions (product delete, order status change, etc.)';
