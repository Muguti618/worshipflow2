/** Same-origin tabs: when the user starts presenting another setlist, other present/audience windows can exit immediately. */
export const PRESENT_ACTIVE_ROOM_BC = "worshipflow2-active-present-room";

export type PresentActiveRoomMessage = { type: "active-present-room"; room: string; at: number };

export function broadcastActivePresentRoom(room: string): void {
  const r = room.trim();
  if (!r) return;
  try {
    const ch = new BroadcastChannel(PRESENT_ACTIVE_ROOM_BC);
    ch.postMessage({ type: "active-present-room", room: r, at: Date.now() } satisfies PresentActiveRoomMessage);
    ch.close();
  } catch {
    /* ignore */
  }
}
