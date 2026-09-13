-- =========================================================
-- Idempotency keys for POST /orders (prevent duplicate orders)
-- Run after 001–004. Safe to run multiple times (IF NOT EXISTS).
-- =========================================================

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  idempotency_key text NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
  ON public.idempotency_keys(created_at);

COMMENT ON TABLE public.idempotency_keys IS 'Stores Idempotency-Key -> order_id for 24h to prevent duplicate order creation';
