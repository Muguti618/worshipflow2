import { DEFAULT_PRESENT_ROOM, readActiveSetlistId } from "@/lib/active-deck";

/**
 * Room id for present / audience / remote. One key per setlist so slide index + mirrored
 * deck stay scoped; phones and projectors must use the same `?room=` as the dashboard links.
 */
export function presentRoomKeyForSetlist(setlistId: string | null | undefined): string {
  const id = setlistId?.trim();
  if (!id) return DEFAULT_PRESENT_ROOM;
  return `setlist-${id}`;
}

export function presentRoomKeyFromActiveSetlist(): string {
  if (typeof window === "undefined") return DEFAULT_PRESENT_ROOM;
  return presentRoomKeyForSetlist(readActiveSetlistId());
}
