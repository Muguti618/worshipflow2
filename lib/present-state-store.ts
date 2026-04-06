/** In-memory room state. Fine for single Node / dev; use Redis in production. */

import type { PresentBeamState } from "@/lib/present-beam";

export type PresentRoomEntry = {
  slideIndex: number;
  updatedAt: number;
  beam: PresentBeamState | null;
};

type G = typeof globalThis & { __wfPresentRooms?: Map<string, PresentRoomEntry> };

function store(): Map<string, PresentRoomEntry> {
  const g = globalThis as G;
  if (!g.__wfPresentRooms) g.__wfPresentRooms = new Map();
  return g.__wfPresentRooms;
}

export function getEntry(room: string): PresentRoomEntry {
  return store().get(room) ?? { slideIndex: 0, updatedAt: Date.now(), beam: null };
}

export function patchEntry(
  room: string,
  patch: { slideIndex?: number; beam?: PresentBeamState | null },
): PresentRoomEntry {
  const cur = getEntry(room);
  const next: PresentRoomEntry = {
    slideIndex:
      typeof patch.slideIndex === "number" && Number.isFinite(patch.slideIndex)
        ? Math.max(0, Math.floor(patch.slideIndex))
        : cur.slideIndex,
    beam: patch.beam !== undefined ? patch.beam : cur.beam,
    updatedAt: Date.now(),
  };
  store().set(room, next);
  return next;
}
