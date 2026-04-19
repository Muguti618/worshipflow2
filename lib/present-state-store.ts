/** In-memory room state. Fine for single Node / dev; use Redis in production. */

import type { PresentBeamState } from "@/lib/present-beam";
import type { DeckSlide } from "@/lib/setlists-catalog";

export type PresentRoomEntry = {
  slideIndex: number;
  updatedAt: number;
  beam: PresentBeamState | null;
  /** Mirrored deck for anonymous multi-tab; optional. */
  deckSlides: DeckSlide[] | null;
};

type G = typeof globalThis & { __wfPresentRooms?: Map<string, PresentRoomEntry> };

function store(): Map<string, PresentRoomEntry> {
  const g = globalThis as G;
  if (!g.__wfPresentRooms) g.__wfPresentRooms = new Map();
  return g.__wfPresentRooms;
}

function defaultEntry(): PresentRoomEntry {
  return { slideIndex: 0, updatedAt: 0, beam: null, deckSlides: null };
}

export function getEntry(room: string): PresentRoomEntry {
  return store().get(room) ?? defaultEntry();
}

export function patchEntry(
  room: string,
  patch: {
    slideIndex?: number;
    beam?: PresentBeamState | null;
    deckSlides?: DeckSlide[] | null;
  },
): PresentRoomEntry {
  const cur = getEntry(room);
  const next: PresentRoomEntry = {
    slideIndex:
      typeof patch.slideIndex === "number" && Number.isFinite(patch.slideIndex)
        ? Math.max(0, Math.floor(patch.slideIndex))
        : cur.slideIndex,
    beam: patch.beam !== undefined ? patch.beam : cur.beam,
    deckSlides: patch.deckSlides !== undefined ? patch.deckSlides : cur.deckSlides,
    updatedAt: Date.now(),
  };
  store().set(room, next);
  return next;
}
