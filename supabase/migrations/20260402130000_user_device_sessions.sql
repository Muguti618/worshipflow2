-- =============================================================================
-- Anti-abuse: device fingerprints + last IP per signed-in user (max 2 devices)
-- =============================================================================
-- App prunes older rows after each register; optional UI warns on concurrent IPs.
-- =============================================================================

CREATE TABLE public.user_device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  fingerprint varchar(128) NOT NULL,
  ip_last text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_device_sessions_user_fingerprint UNIQUE (user_id, fingerprint)
);

CREATE INDEX user_device_sessions_user_last_seen_idx
  ON public.user_device_sessions (user_id, last_seen_at DESC);

COMMENT ON TABLE public.user_device_sessions IS
  'Browser visitorId (FingerprintJS) + last request IP; capped at two rows per user.';

ALTER TABLE public.user_device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_device_sessions_own_all"
  ON public.user_device_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
