-- =============================================================================
-- LumenWorship — Supabase / PostgreSQL core schema
-- =============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New query → Paste → Run
-- Or:     supabase db push (CLI linked project)
--
-- Includes:
--   • public.profiles        — 1:1 with auth.users (display name, avatar)
--   • public.user_settings   — theme + last active setlist (UUID in DB)
--   • public.songs           — library songs (slides JSONB = DeckSlide[])
--   • public.setlists        — service orders (items JSONB = SetlistItem[])
--   • public.present_states  — server-side slide index + Bible beam per user+room
--
-- Setlist JSON field `items[].songId` should match either:
--   songs.id::text (UUID) after cloud migration, or
--   songs.legacy_client_id while you still store old browser ids in JSON.
--
-- Auth: enable Email (and/or OAuth) in Authentication → Providers.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions (gen_random_uuid is built into PostgreSQL 13+; Supabase has it)
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- updated_at helper
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.wf_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (synced on signup)
-- -----------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.wf_set_updated_at();

-- -----------------------------------------------------------------------------
-- User settings (theme, optional pointer to active setlist)
-- -----------------------------------------------------------------------------

CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark'
    CHECK (theme IN ('light', 'dark')),
  active_setlist_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE PROCEDURE public.wf_set_updated_at();

-- FK to setlists added after setlists table exists (see bottom of file).

-- -----------------------------------------------------------------------------
-- Songs (LibrarySong — slides stored as JSONB array of deck slides)
-- -----------------------------------------------------------------------------

CREATE TABLE public.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  legacy_client_id text,
  title text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  structure text NOT NULL DEFAULT 'Custom',
  background_url text,
  background_color text,
  slides jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(slides) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT songs_legacy_per_user UNIQUE (user_id, legacy_client_id)
);

COMMENT ON COLUMN public.songs.legacy_client_id IS
  'Original browser id (e.g. user-song-173…) so setlist items JSON songId can resolve during migration.';
COMMENT ON COLUMN public.songs.slides IS
  'JSON array matching app type DeckSlide[] (title, lines, optional backgroundUrl, backgroundColor, typography, audienceCitation).';

CREATE INDEX songs_user_id_updated_at_idx
  ON public.songs (user_id, updated_at DESC);

CREATE TRIGGER songs_updated_at
  BEFORE UPDATE ON public.songs
  FOR EACH ROW
  EXECUTE PROCEDURE public.wf_set_updated_at();

-- -----------------------------------------------------------------------------
-- Setlists (SetlistDefinition — items stored as JSONB SetlistItem[])
-- -----------------------------------------------------------------------------

CREATE TABLE public.setlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  legacy_client_id text,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(items) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT setlists_legacy_per_user UNIQUE (user_id, legacy_client_id)
);

COMMENT ON COLUMN public.setlists.items IS
  'JSON array matching app type SetlistItem[] (id, kind, name, songId?, slides, itemBackgroundUrl?, itemBackgroundColor?, itemTypography?).';
COMMENT ON COLUMN public.setlists.legacy_client_id IS
  'Original browser setlist id (e.g. user-173…) for migration.';

CREATE INDEX setlists_user_id_updated_at_idx
  ON public.setlists (user_id, updated_at DESC);

CREATE TRIGGER setlists_updated_at
  BEFORE UPDATE ON public.setlists
  FOR EACH ROW
  EXECUTE PROCEDURE public.wf_set_updated_at();

-- -----------------------------------------------------------------------------
-- Auth bootstrap: profile + default settings (one trigger on auth.users)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.wf_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''),
      NULLIF(split_part(NEW.email, '@', 1), ''),
      'LumenWorship user'
    )
  );
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.wf_handle_new_user();

-- -----------------------------------------------------------------------------
-- Presenter room state (replaces in-memory Node store when wired to Supabase)
-- -----------------------------------------------------------------------------

CREATE TABLE public.present_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  room_key text NOT NULL DEFAULT 'default',
  slide_index integer NOT NULL DEFAULT 0
    CHECK (slide_index >= 0),
  beam jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT present_states_user_room UNIQUE (user_id, room_key)
);

COMMENT ON COLUMN public.present_states.room_key IS
  'Same as ?room= on /present (e.g. default). Scoped per user_id.';
COMMENT ON COLUMN public.present_states.beam IS
  'PresentBeamState JSON: { "slides": DeckSlide[], "index": number } or null.';

CREATE INDEX present_states_user_id_idx ON public.present_states (user_id);

CREATE TRIGGER present_states_updated_at
  BEFORE UPDATE ON public.present_states
  FOR EACH ROW
  EXECUTE PROCEDURE public.wf_set_updated_at();

-- -----------------------------------------------------------------------------
-- Link user_settings.active_setlist_id → setlists (deferrable)
-- -----------------------------------------------------------------------------

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_active_setlist_fk
  FOREIGN KEY (active_setlist_id)
  REFERENCES public.setlists (id)
  ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.present_states ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update only their row
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- User settings
CREATE POLICY "user_settings_select_own"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_settings_insert_own"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_update_own"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Songs
CREATE POLICY "songs_select_own"
  ON public.songs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "songs_insert_own"
  ON public.songs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "songs_update_own"
  ON public.songs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "songs_delete_own"
  ON public.songs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Setlists
CREATE POLICY "setlists_select_own"
  ON public.setlists FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "setlists_insert_own"
  ON public.setlists FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "setlists_update_own"
  ON public.setlists FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "setlists_delete_own"
  ON public.setlists FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Present states
CREATE POLICY "present_states_select_own"
  ON public.present_states FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "present_states_insert_own"
  ON public.present_states FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "present_states_update_own"
  ON public.present_states FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "present_states_delete_own"
  ON public.present_states FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Realtime (optional): uncomment to sync presenter state across devices
-- -----------------------------------------------------------------------------
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.present_states;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.setlists;

-- -----------------------------------------------------------------------------
-- Storage bucket (background uploads) — create bucket in Dashboard, then run:
-- -----------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public) values ('wf-assets', 'wf-assets', false);
--
-- create policy "wf_assets_select_own"
--   on storage.objects for select to authenticated
--   using (bucket_id = 'wf-assets' and (storage.foldername(name))[1] = auth.uid()::text);
--
-- create policy "wf_assets_insert_own"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'wf-assets' and (storage.foldername(name))[1] = auth.uid()::text);
--
-- create policy "wf_assets_update_own"
--   on storage.objects for update to authenticated
--   using (bucket_id = 'wf-assets' and (storage.foldername(name))[1] = auth.uid()::text);
--
-- create policy "wf_assets_delete_own"
--   on storage.objects for delete to authenticated
--   using (bucket_id = 'wf-assets' and (storage.foldername(name))[1] = auth.uid()::text);
