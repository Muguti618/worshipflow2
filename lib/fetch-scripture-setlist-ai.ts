import type { BibleTranslationKey } from "@/lib/bible-lookup";

export type ScriptureSetlistAiPayload = {
  ref: string;
  slides: { title: string; lines: string[] }[];
  note?: string;
};

export type FetchScriptureSetlistOutcome =
  | { ok: true; data: ScriptureSetlistAiPayload }
  | { ok: false; error: string };

export async function fetchScriptureSetlistAi(
  query: string,
  translation: BibleTranslationKey,
): Promise<FetchScriptureSetlistOutcome> {
  try {
    const res = await fetch("/api/ai/scripture-setlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, translation }),
    });
    const raw = (await res.json()) as {
      error?: string;
      ref?: unknown;
      slides?: unknown;
      note?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error:
          typeof raw.error === "string"
            ? raw.error
            : `Could not load scripture AI (${res.status}).`,
      };
    }
    const ref = typeof raw.ref === "string" ? raw.ref : "";
    if (!ref) return { ok: false, error: "Server returned no reference." };
    if (!Array.isArray(raw.slides) || raw.slides.length === 0) {
      return { ok: false, error: "Server returned no slides." };
    }
    const slides = raw.slides
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const o = s as { title?: unknown; lines?: unknown };
        const lines = Array.isArray(o.lines) ? o.lines.map((l) => String(l)) : [];
        return { title: String(o.title ?? ref), lines };
      })
      .filter((x): x is { title: string; lines: string[] } => x !== null);
    if (!slides.length) return { ok: false, error: "Invalid slide data from server." };
    return {
      ok: true,
      data: {
        ref,
        slides,
        note: typeof raw.note === "string" ? raw.note : undefined,
      },
    };
  } catch {
    return { ok: false, error: "Network error — check your connection." };
  }
}
