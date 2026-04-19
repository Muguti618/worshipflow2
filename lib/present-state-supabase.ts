import type { PresentBeamState } from "@/lib/present-beam";
import { parsePresentBeamState } from "@/lib/present-beam";
import { parseDeckSlidesJson } from "@/lib/present-deck-json";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DeckSlide } from "@/lib/setlists-catalog";

export type PresentStatePayload = {
  room: string;
  slideIndex: number;
  beam: PresentBeamState | null;
  updatedAt: number;
  deck: DeckSlide[] | null;
  /**
   * True when this `room` has no DB row but another `present_states` row exists for the user —
   * presenting switched to a different setlist / room, so this URL is no longer live.
   */
  superseded?: boolean;
};

function deckFromRow(raw: unknown): DeckSlide[] | null {
  return parseDeckSlidesJson(raw);
}

/** Signed-in users: shared DB row so verse beams and deck sync work across devices. */
export async function getPresentStateFromSupabase(room: string): Promise<PresentStatePayload | null> {
  const sb = await createServerSupabaseClient();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return null;

  const { data, error } = await sb
    .from("present_states")
    .select("slide_index, beam, updated_at, deck_slides")
    .eq("user_id", user.id)
    .eq("room_key", room)
    .maybeSingle();

  if (error) return null;

  if (!data) {
    const { data: other } = await sb
      .from("present_states")
      .select("room_key")
      .eq("user_id", user.id)
      .neq("room_key", room)
      .limit(1)
      .maybeSingle();
    const superseded = Boolean(other);
    return {
      room,
      slideIndex: 0,
      beam: null,
      // Use 0 when not superseded so clients treat this as older than any real row and ignore
      // it after sync (Date.now() here always "won" stale checks and reset slide → title).
      updatedAt: superseded ? Date.now() : 0,
      deck: null,
      ...(superseded ? { superseded: true as const } : {}),
    };
  }

  const beamParsed =
    data.beam === null || data.beam === undefined ? null : parsePresentBeamState(data.beam);

  return {
    room,
    slideIndex: typeof data.slide_index === "number" ? Math.max(0, data.slide_index) : 0,
    beam: beamParsed,
    updatedAt: data.updated_at ? new Date(data.updated_at as string).getTime() : Date.now(),
    deck: deckFromRow((data as { deck_slides?: unknown }).deck_slides),
  };
}

type PresentStateRow = {
  slide_index: unknown;
  beam: unknown;
  updated_at: unknown;
  deck_slides?: unknown;
};

function rowToPayload(room: string, row: PresentStateRow): PresentStatePayload {
  const beamParsed =
    row.beam === null || row.beam === undefined ? null : parsePresentBeamState(row.beam);
  return {
    room,
    slideIndex: typeof row.slide_index === "number" ? Math.max(0, row.slide_index) : 0,
    beam: beamParsed,
    updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : Date.now(),
    deck: deckFromRow(row.deck_slides),
  };
}

export type PresentStatePatch = {
  slideIndex?: number;
  beam?: PresentBeamState | null;
  /** Replace mirrored deck; null clears. */
  deck?: DeckSlide[] | null;
};

/**
 * Apply slide / beam / deck patches without read–modify–write on the full row.
 */
export async function patchPresentStateInSupabase(
  room: string,
  patch: PresentStatePatch,
): Promise<PresentStatePayload | null> {
  const sb = await createServerSupabaseClient();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return null;

  const userId = user.id;
  const hasSlide = typeof patch.slideIndex === "number" && Number.isFinite(patch.slideIndex);
  const hasBeam = "beam" in patch;
  const hasDeck = "deck" in patch;
  if (!hasSlide && !hasBeam && !hasDeck) return null;

  const updatePayload: {
    slide_index?: number;
    beam?: PresentBeamState | null;
    deck_slides?: DeckSlide[] | null;
  } = {};
  if (hasSlide) {
    updatePayload.slide_index = Math.max(0, Math.floor(patch.slideIndex as number));
  }
  if (hasBeam) {
    updatePayload.beam = patch.beam ?? null;
  }
  if (hasDeck) {
    updatePayload.deck_slides = patch.deck ?? null;
  }

  const { data: updated, error: updateErr } = await sb
    .from("present_states")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("room_key", room)
    .select("slide_index, beam, updated_at, deck_slides");

  if (updateErr) return null;

  if (updated && updated.length > 0) {
    return rowToPayload(room, updated[0] as PresentStateRow);
  }

  const insertSlide = hasSlide ? Math.max(0, Math.floor(patch.slideIndex as number)) : 0;
  const insertBeam = hasBeam ? patch.beam ?? null : null;
  const insertDeck = hasDeck ? patch.deck ?? null : null;

  const { data: inserted, error: insertErr } = await sb
    .from("present_states")
    .insert({
      user_id: userId,
      room_key: room,
      slide_index: insertSlide,
      beam: insertBeam,
      deck_slides: insertDeck,
    })
    .select("slide_index, beam, updated_at, deck_slides")
    .maybeSingle();

  if (!insertErr && inserted) {
    return rowToPayload(room, inserted as PresentStateRow);
  }

  const { data: retry, error: retryErr } = await sb
    .from("present_states")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("room_key", room)
    .select("slide_index, beam, updated_at, deck_slides");

  if (retryErr || !retry?.length) return null;
  return rowToPayload(room, retry[0] as PresentStateRow);
}

/** After updating one room, remove all other mirrored presenter rows so only one setlist stays live. */
export async function clearPresentStatesExceptRoom(room: string): Promise<void> {
  const sb = await createServerSupabaseClient();
  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return;

  await sb.from("present_states").delete().eq("user_id", user.id).neq("room_key", room);
}
