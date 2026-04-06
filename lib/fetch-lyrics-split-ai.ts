import type { SlideCard } from "@/lib/slide-engine";

export type LyricsSplitOutcome =
  | {
      ok: true;
      slides: SlideCard[];
      structure?: string;
      note?: string;
    }
  | { ok: false; error: string };

export async function fetchLyricsSplitAi(
  lyrics: string,
  options?: { title?: string; maxLinesPerSlide?: number },
): Promise<LyricsSplitOutcome> {
  try {
    const res = await fetch("/api/ai/split-lyrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lyrics,
        title: options?.title ?? "",
        maxLinesPerSlide: options?.maxLinesPerSlide ?? 3,
      }),
    });
    const raw = (await res.json()) as {
      error?: string;
      slides?: unknown;
      structure?: string;
      note?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error:
          typeof raw.error === "string"
            ? raw.error
            : `Split request failed (${res.status}).`,
      };
    }
    if (!Array.isArray(raw.slides) || raw.slides.length === 0) {
      return { ok: false, error: "Server returned no slides." };
    }
    const slides = raw.slides
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const o = s as { title?: unknown; lines?: unknown };
        const lines = Array.isArray(o.lines) ? o.lines.map((l) => String(l)) : [];
        return { title: String(o.title ?? "Slide"), lines };
      })
      .filter((x): x is SlideCard => x !== null);
    if (!slides.length) return { ok: false, error: "Invalid slide data from server." };
    return {
      ok: true,
      slides,
      structure: typeof raw.structure === "string" ? raw.structure : undefined,
      note: typeof raw.note === "string" ? raw.note : undefined,
    };
  } catch {
    return { ok: false, error: "Network error — check your connection." };
  }
}
