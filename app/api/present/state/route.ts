/**
 * In-memory sync for anonymous / local dev. Signed-in users with Supabase use `present_states`
 * so verse beams, slide index, and mirrored deck survive serverless cold instances.
 */
import type { PresentBeamState } from "@/lib/present-beam";
import { parsePresentBeamState } from "@/lib/present-beam";
import { parseDeckSlidesJson } from "@/lib/present-deck-json";
import {
  clearPresentStatesExceptRoom,
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
      deck: cloud.deck,
      ...(cloud.superseded ? { superseded: true } : {}),
    });
  }
  const e = getEntry(room);
  return Response.json({
    room,
    slideIndex: e.slideIndex,
    beam: e.beam,
    updatedAt: e.updatedAt,
    deck: e.deckSlides,
  });
}

export async function POST(req: Request) {
  let body: {
    room?: string;
    slideIndex?: number;
    beam?: PresentBeamState | null | unknown;
    deck?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const room = typeof body.room === "string" && body.room.trim() ? body.room.trim() : "default";

  const patch: {
    slideIndex?: number;
    beam?: PresentBeamState | null;
    deck?: import("@/lib/setlists-catalog").DeckSlide[] | null;
  } = {};

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

  if ("deck" in body) {
    if (body.deck === null) {
      patch.deck = null;
    } else {
      const parsed = parseDeckSlidesJson(body.deck);
      if (!parsed?.length) {
        return Response.json({ error: "Invalid deck: expected a non-empty array of slides" }, { status: 400 });
      }
      patch.deck = parsed;
    }
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No valid fields" }, { status: 400 });
  }

  const cloud = await patchPresentStateInSupabase(room, patch);
  if (cloud) {
    await clearPresentStatesExceptRoom(room);
    return Response.json({
      ok: true,
      room: cloud.room,
      slideIndex: cloud.slideIndex,
      beam: cloud.beam,
      updatedAt: cloud.updatedAt,
      deck: cloud.deck,
    });
  }

  const entry = patchEntry(room, {
    ...(typeof patch.slideIndex === "number" ? { slideIndex: patch.slideIndex } : {}),
    ...("beam" in patch ? { beam: patch.beam } : {}),
    ...("deck" in patch ? { deckSlides: patch.deck } : {}),
  });
  return Response.json({
    ok: true,
    room,
    slideIndex: entry.slideIndex,
    beam: entry.beam,
    updatedAt: entry.updatedAt,
    deck: entry.deckSlides,
  });
}
