import type { PresentBeamState } from "@/lib/present-beam";
import { parsePresentBeamState } from "@/lib/present-beam";

/** Keep presenter slide index + beam in localStorage so /present works without network after refresh. */
const SLIDE_PREFIX = "worshipflow-present-slide:";
const BEAM_PREFIX = "worshipflow-present-beam:";

export function safePresentRoomKey(room: string): string {
  const s = room.trim().slice(0, 64);
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return "default";
  return s;
}

export function readPersistedSlideIndex(room: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SLIDE_PREFIX + safePresentRoomKey(room));
    if (!raw) return null;
    const j = JSON.parse(raw) as { slideIndex?: unknown };
    if (typeof j.slideIndex !== "number" || !Number.isFinite(j.slideIndex)) return null;
    return Math.floor(j.slideIndex);
  } catch {
    return null;
  }
}

export function writePersistedSlideIndex(room: string, slideIndex: number): void {
  try {
    localStorage.setItem(
      SLIDE_PREFIX + safePresentRoomKey(room),
      JSON.stringify({ slideIndex, t: Date.now() }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function readPersistedBeam(room: string): PresentBeamState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BEAM_PREFIX + safePresentRoomKey(room));
    if (!raw) return null;
    const j = JSON.parse(raw) as { beam?: unknown };
    if (j.beam === null) return null;
    return parsePresentBeamState(j.beam);
  } catch {
    return null;
  }
}

export function writePersistedBeam(room: string, beam: PresentBeamState | null): void {
  try {
    const key = BEAM_PREFIX + safePresentRoomKey(room);
    if (beam === null) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify({ beam, t: Date.now() }));
  } catch {
    /* quota */
  }
}
