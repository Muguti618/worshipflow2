import type { PresentBeamState } from "@/lib/present-beam";
import { parsePresentBeamState } from "@/lib/present-beam";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PresentStatePayload = {
  room: string;
  slideIndex: number;
  beam: PresentBeamState | null;
  updatedAt: number;
};

/** Signed-in users: shared DB row so verse beams work across serverless instances. */
export async function getPresentStateFromSupabase(room: string): Promise<PresentStatePayload | null> {
  const sb = await createServerSupabaseClient();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return null;

  const { data, error } = await sb
    .from("present_states")
    .select("slide_index, beam, updated_at")
    .eq("user_id", user.id)
    .eq("room_key", room)
    .maybeSingle();

  if (error) return null;

  if (!data) {
    return { room, slideIndex: 0, beam: null, updatedAt: Date.now() };
  }

  const beamParsed =
    data.beam === null || data.beam === undefined ? null : parsePresentBeamState(data.beam);

  return {
    room,
    slideIndex: typeof data.slide_index === "number" ? Math.max(0, data.slide_index) : 0,
    beam: beamParsed,
    updatedAt: data.updated_at ? new Date(data.updated_at as string).getTime() : Date.now(),
  };
}

function rowToPayload(
  room: string,
  row: { slide_index: unknown; beam: unknown; updated_at: unknown },
): PresentStatePayload {
  const beamParsed =
    row.beam === null || row.beam === undefined ? null : parsePresentBeamState(row.beam);
  return {
    room,
    slideIndex: typeof row.slide_index === "number" ? Math.max(0, row.slide_index) : 0,
    beam: beamParsed,
    updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : Date.now(),
  };
}

/**
 * Apply slide / beam patches without read–modify–write on the full row.
 * Otherwise a beam-only POST can race with a slide advance and write back a stale `slide_index`
 * (presenter + audience briefly jump to old slides).
 */
export async function patchPresentStateInSupabase(
  room: string,
  patch: { slideIndex?: number; beam?: PresentBeamState | null },
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
  if (!hasSlide && !hasBeam) return null;

  const updatePayload: { slide_index?: number; beam?: PresentBeamState | null } = {};
  if (hasSlide) {
    updatePayload.slide_index = Math.max(0, Math.floor(patch.slideIndex as number));
  }
  if (hasBeam) {
    updatePayload.beam = patch.beam ?? null;
  }

  const { data: updated, error: updateErr } = await sb
    .from("present_states")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("room_key", room)
    .select("slide_index, beam, updated_at");

  if (updateErr) return null;

  if (updated && updated.length > 0) {
    return rowToPayload(room, updated[0] as { slide_index: unknown; beam: unknown; updated_at: unknown });
  }

  const insertSlide = hasSlide ? Math.max(0, Math.floor(patch.slideIndex as number)) : 0;
  const insertBeam = hasBeam ? patch.beam ?? null : null;

  const { data: inserted, error: insertErr } = await sb
    .from("present_states")
    .insert({
      user_id: userId,
      room_key: room,
      slide_index: insertSlide,
      beam: insertBeam,
    })
    .select("slide_index, beam, updated_at")
    .maybeSingle();

  if (!insertErr && inserted) {
    return rowToPayload(room, inserted as { slide_index: unknown; beam: unknown; updated_at: unknown });
  }

  /* Row may have been created between update and insert (unique conflict). */
  const { data: retry, error: retryErr } = await sb
    .from("present_states")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("room_key", room)
    .select("slide_index, beam, updated_at");

  if (retryErr || !retry?.length) return null;
  return rowToPayload(room, retry[0] as { slide_index: unknown; beam: unknown; updated_at: unknown });
}
