import type { DeckSlide } from "@/lib/setlists-catalog";

/** Shown when no deck is stored or the setlist is empty — not a worship template. */
export const EMPTY_PRESENTER_PLACEHOLDER: DeckSlide[] = [
  {
    title: "No setlist loaded",
    lines: [
      "Create a setlist under Setlists, then choose it here or tap Send to presenter.",
    ],
  },
];

export const ACTIVE_DECK_STORAGE_KEY = "worshipflow2-active-deck";
export const ACTIVE_SETLIST_ID_KEY = "worshipflow2-active-setlist-id";
export const DECK_SYNC_CHANNEL = "worshipflow2-deck-sync";
export const DEFAULT_PRESENT_ROOM = "default";

export function readActiveDeck(): DeckSlide[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_DECK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as DeckSlide[];
  } catch {
    return null;
  }
}

export function readActiveSetlistId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_SETLIST_ID_KEY);
}

export function writeActiveDeck(slides: DeckSlide[], setlistId: string): void {
  localStorage.setItem(ACTIVE_DECK_STORAGE_KEY, JSON.stringify(slides));
  localStorage.setItem(ACTIVE_SETLIST_ID_KEY, setlistId);
}

export function broadcastDeckUpdated(): void {
  try {
    const ch = new BroadcastChannel(DECK_SYNC_CHANNEL);
    ch.postMessage({ type: "deck-updated" });
    ch.close();
  } catch {
    /* ignore */
  }
}

/** Reset presenter slide index (same tab + other tabs listening to BC / poll). */
export function broadcastSlideReset(room: string): void {
  try {
    const ch = new BroadcastChannel(`worshipflow2-present:${room}`);
    ch.postMessage({ type: "slide", index: 0 });
    ch.close();
  } catch {
    /* ignore */
  }
}

export async function postPresenterSlide(room: string, slideIndex: number): Promise<void> {
  try {
    await fetch("/api/present/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, slideIndex }),
    });
  } catch {
    /* offline */
  }
}
