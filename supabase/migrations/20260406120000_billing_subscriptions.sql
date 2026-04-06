-- =============================================================================
-- Billing / Stripe — per-user plan (free | pro_monthly | pro_yearly)
-- =============================================================================
-- Run after worshipflow_core migration. Webhook + server use service role to
-- upsert; users may SELECT their own row via RLS.
-- =============================================================================

CREATE TABLE public.billing_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro_monthly', 'pro_yearly')),
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'none'
    CHECK (status IN (
      'none',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused',
      'incomplete',
      'incomplete_expired'
    )),
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.billing_subscriptions IS
  'Stripe subscription mirror: tier + status updated from webhooks only (service role).';
COMMENT ON COLUMN public.billing_subscriptions.tier IS
  'free = no paid sub; pro_monthly / pro_yearly = which Stripe price is active when status is paid.';
COMMENT ON COLUMN public.billing_subscriptions.status IS
  'Stripe subscription.status; none = no subscription row yet.';

CREATE INDEX billing_subscriptions_stripe_customer_id_idx
  ON public.billing_subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE TRIGGER billing_subscriptions_updated_at
  BEFORE UPDATE ON public.billing_subscriptions
  FOR EACH ROW
  EXECUTE PROCEDURE public.wf_set_updated_at();

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_subscriptions_select_own"
  ON public.billing_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for authenticated — only service role (webhook) writes.
