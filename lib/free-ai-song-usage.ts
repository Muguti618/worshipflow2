/** Free tier: one AI-assisted “new song” (slide splitting via /api/ai/song-present). */
const STORAGE_KEY = "worshipflow2.freeTierAiSongSplitUsed";

export function readFreeTierAiSongSplitUsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFreeTierAiSongSplitUsed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore quota */
  }
}
