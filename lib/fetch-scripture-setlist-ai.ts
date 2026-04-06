import type { BibleTranslationKey } from "@/lib/bible-lookup";

export type ScriptureSetlistAiPayload = {
  ref: string;
  slides: { title: string; lines: string[] }[];
  note?: string;
};

export type ScriptureSetlistAiOption = {
  ref: string;
  slides: { title: string; lines: string[] }[];
  blurb?: string;
};

export type ScriptureSetlistAiMultiPayload = {
  options: ScriptureSetlistAiOption[];
  note?: string;
};

export type FetchScriptureSetlistOutcome =
  | { ok: true; data: ScriptureSetlistAiPayload | ScriptureSetlistAiMultiPayload }
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
      options?: unknown;
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

    // New multi-option payload (topic queries)
    if (Array.isArray(raw.options)) {
      const options = raw.options
        .map((o) => {
          if (!o || typeof o !== "object") return null;
          const v = o as { ref?: unknown; slides?: unknown; blurb?: unknown };
          const ref = typeof v.ref === "string" ? v.ref : "";
          if (!ref) return null;
          const slidesRaw = Array.isArray(v.slides) ? v.slides : [];
          const slides = slidesRaw
            .map((s) => {
              if (!s || typeof s !== "object") return null;
              const sl = s as { title?: unknown; lines?: unknown };
              const lines = Array.isArray(sl.lines) ? sl.lines.map((l) => String(l)) : [];
              return { title: String(sl.title ?? ref), lines };
            })
            .filter((x): x is { title: string; lines: string[] } => x !== null);
          if (!slides.length) return null;
          const blurb = typeof v.blurb === "string" ? v.blurb : undefined;
          const base: ScriptureSetlistAiOption = { ref, slides };
          if (blurb) base.blurb = blurb;
          return base;
        })
        .filter((x): x is ScriptureSetlistAiOption => x !== null);

      return {
        ok: true,
        data: {
          options,
          note: typeof raw.note === "string" ? raw.note : undefined,
        },
      };
    }

    // Legacy single payload (reference queries)
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
