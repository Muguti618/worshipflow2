import { DEFAULT_PRESENT_ROOM } from "@/lib/active-deck";

/** Resolve `?room=` from App Router `searchParams` (string or string[]). */
export function roomFromSearchParams(sp: { room?: string | string[] } | undefined): string {
  if (!sp) return DEFAULT_PRESENT_ROOM;
  const r = sp.room;
  const s = Array.isArray(r) ? r[0] : r;
  const t = typeof s === "string" ? s.trim() : "";
  return t || DEFAULT_PRESENT_ROOM;
}
