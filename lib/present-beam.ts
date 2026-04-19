import type { DeckSlide } from "@/lib/setlists-catalog";

/** Bible (or other) overlay on top of the setlist deck — same room sync as slide index. */
export type PresentBeamState = {
  slides: DeckSlide[];
  index: number;
};

function isDeckSlideLoose(x: unknown): x is DeckSlide {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.title === "string" && Array.isArray(o.lines) && o.lines.every((l) => typeof l === "string");
}

/** Parse and clamp beam payload from API or BroadcastChannel. */
export function parsePresentBeamState(raw: unknown): PresentBeamState | null {
  if (raw == null) return null;
  let o: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return null;
      o = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof raw === "object") {
    o = raw as Record<string, unknown>;
  } else {
    return null;
  }
  if (!Array.isArray(o.slides)) return null;
  const slides: DeckSlide[] = [];
  for (const s of o.slides.slice(0, 80)) {
    if (!isDeckSlideLoose(s)) continue;
    const title = s.title.slice(0, 240);
    const lines = s.lines.slice(0, 50).map((l) => l.slice(0, 800));
    const slide: DeckSlide = { title, lines };
    if (typeof s.backgroundUrl === "string" && s.backgroundUrl.length < 2500) {
      slide.backgroundUrl = s.backgroundUrl;
    }
    if (typeof s.backgroundColor === "string" && s.backgroundColor.length < 80) {
      slide.backgroundColor = s.backgroundColor;
    }
    if (s.typography === "default" || s.typography === "editorial") {
      slide.typography = s.typography;
    }
    if (s.backgroundFullBleed === true) {
      slide.backgroundFullBleed = true;
    }
    const ac = (s as Record<string, unknown>).audienceCitation;
    if (typeof ac === "string") {
      const t = ac.trim().slice(0, 240);
      if (t) slide.audienceCitation = t;
    }
    slides.push(slide);
  }
  if (slides.length === 0) return null;
  let index = typeof o.index === "number" && Number.isFinite(o.index) ? Math.floor(o.index) : 0;
  index = Math.max(0, Math.min(slides.length - 1, index));
  return { slides, index };
}
