import { FREE_MAX_VERSE_BEAMS } from "@/lib/plan-limits";

const STORAGE_KEY = "worshipflow2.freeVerseBeamsUsed";

export function readVerseBeamUsageCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Increments usage after a successful beam; returns the new total. */
export function incrementVerseBeamUsage(): number {
  if (typeof window === "undefined") return 0;
  try {
    const next = readVerseBeamUsageCount() + 1;
    localStorage.setItem(STORAGE_KEY, String(next));
    return next;
  } catch {
    return readVerseBeamUsageCount();
  }
}

export function verseBeamsRemaining(used: number): number {
  return Math.max(0, FREE_MAX_VERSE_BEAMS - used);
}
