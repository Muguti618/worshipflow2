-- Mirrored active deck for cross-device present / audience / remote (same user + room).
ALTER TABLE public.present_states
  ADD COLUMN IF NOT EXISTS deck_slides jsonb;

COMMENT ON COLUMN public.present_states.deck_slides IS
  'Optional JSON array of DeckSlide objects synced from the presenter machine for remote/audience.';
