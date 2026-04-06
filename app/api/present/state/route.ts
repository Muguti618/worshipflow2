/**
 * In-memory sync for anonymous / local dev. Signed-in users with Supabase use `present_states`
 * so verse beams and slide index survive serverless cold instances.
 */
import type { PresentBeamState } from "@/lib/present-beam";
import { parsePresentBeamState } from "@/lib/present-beam";
import {
  getPresentStateFromSupabase,
  patchPresentStateInSupabase,
} from "@/lib/present-state-supabase";
import { getEntry, patchEntry } from "@/lib/present-state-store";

export async function GET(req: Request) {
  const room = new URL(req.url).searchParams.get("room")?.trim() || "default";
  const cloud = await getPresentStateFromSupabase(room);
  if (cloud) {
    return Response.json({
      room: cloud.room,
      slideIndex: cloud.slideIndex,
      beam: cloud.beam,
      updatedAt: cloud.updatedAt,
    });
  }
  const e = getEntry(room);
  return Response.json({ room, slideIndex: e.slideIndex, beam: e.beam, updatedAt: e.updatedAt });
}

export async function POST(req: Request) {
  let body: {
    room?: string;
    slideIndex?: number;
    beam?: PresentBeamState | null | unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const room = typeof body.room === "string" && body.room.trim() ? body.room.trim() : "default";

  const patch: { slideIndex?: number; beam?: PresentBeamState | null } = {};

  if (typeof body.slideIndex === "number" && Number.isFinite(body.slideIndex)) {
    patch.slideIndex = Math.max(0, Math.floor(body.slideIndex));
  }

  if ("beam" in body) {
    if (body.beam === null) {
      patch.beam = null;
    } else {
      const parsed = parsePresentBeamState(body.beam);
      if (!parsed) {
        return Response.json({ error: "Invalid beam payload" }, { status: 400 });
      }
      patch.beam = parsed;
    }
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No valid fields" }, { status: 400 });
  }

  const cloud = await patchPresentStateInSupabase(room, patch);
  if (cloud) {
    return Response.json({
      ok: true,
      room: cloud.room,
      slideIndex: cloud.slideIndex,
      beam: cloud.beam,
      updatedAt: cloud.updatedAt,
    });
  }

  const entry = patchEntry(room, patch);
  return Response.json({
    ok: true,
    room,
    slideIndex: entry.slideIndex,
    beam: entry.beam,
    updatedAt: entry.updatedAt,
  });
}
