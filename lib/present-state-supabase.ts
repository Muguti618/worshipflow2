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

  const { data: row } = await sb
    .from("present_states")
    .select("slide_index, beam")
    .eq("user_id", user.id)
    .eq("room_key", room)
    .maybeSingle();

  let slideIndex = typeof row?.slide_index === "number" ? Math.max(0, row.slide_index) : 0;
  let beam: PresentBeamState | null =
    row?.beam === null || row?.beam === undefined ? null : parsePresentBeamState(row.beam);

  if (typeof patch.slideIndex === "number") {
    slideIndex = Math.max(0, Math.floor(patch.slideIndex));
  }
  if (patch.beam !== undefined) {
    beam = patch.beam;
  }

  const { data: out, error } = await sb
    .from("present_states")
    .upsert(
      {
        user_id: user.id,
        room_key: room,
        slide_index: slideIndex,
        beam,
      },
      { onConflict: "user_id,room_key" },
    )
    .select("slide_index, beam, updated_at")
    .single();

  if (error || !out) return null;

  const outBeam =
    out.beam === null || out.beam === undefined ? null : parsePresentBeamState(out.beam);

  return {
    room,
    slideIndex: typeof out.slide_index === "number" ? Math.max(0, out.slide_index) : slideIndex,
    beam: outBeam,
    updatedAt: out.updated_at ? new Date(out.updated_at as string).getTime() : Date.now(),
  };
}
