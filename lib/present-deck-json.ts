import type { DeckSlide } from "@/lib/setlists-catalog";

/** Parse deck_slides from DB or API JSON. */
export function parseDeckSlidesJson(raw: unknown): DeckSlide[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: DeckSlide[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : "";
    const lines = Array.isArray(o.lines)
      ? o.lines.filter((l): l is string => typeof l === "string")
      : [];
    const layout = o.layout === "song-title" ? "song-title" : undefined;
    const slide: DeckSlide = {
      title,
      lines,
      ...(layout ? { layout } : {}),
    };
    if (typeof o.backgroundUrl === "string" && o.backgroundUrl.trim())
      slide.backgroundUrl = o.backgroundUrl.trim();
    if (typeof o.backgroundColor === "string" && o.backgroundColor.trim())
      slide.backgroundColor = o.backgroundColor.trim();
    if (o.backgroundFullBleed === true) slide.backgroundFullBleed = true;
    if (o.typography === "default" || o.typography === "editorial") slide.typography = o.typography;
    if (typeof o.audienceCitation === "string" && o.audienceCitation.trim())
      slide.audienceCitation = o.audienceCitation.trim();
    out.push(slide);
  }
  return out.length > 0 ? out : null;
}

export function serializeDeckSlides(slides: DeckSlide[]): unknown {
  return slides;
}
