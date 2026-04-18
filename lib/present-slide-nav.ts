import type { DeckSlide } from "@/lib/setlists-catalog";

/** Short lyric / body preview for slide lists (presenter jump UI). */
export function slideSubtitlePreview(slide: DeckSlide, maxLen = 140): string {
  const parts = slide.lines.map((l) => l.trim()).filter(Boolean);
  const joined = parts.join(" · ");
  if (joined) {
    if (joined.length <= maxLen) return joined;
    return `${joined.slice(0, maxLen).trimEnd()}…`;
  }
  if ((slide.layout ?? "") === "song-title") return "Song title card";
  if (slide.title?.trim()) return "—";
  return "Empty slide";
}
