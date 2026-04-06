import { BACKGROUND_PRESETS } from "@/lib/background-presets";
import type { CustomSetlistBlockKind } from "@/lib/ai-dummy-data";
import type { VerseSuggestion } from "@/lib/bible-topic-suggestions";
import type { SlideTypography } from "@/lib/setlists-catalog";
import type { OpenAIConfig } from "@/lib/openai-server";
import { openaiJsonCompletion } from "@/lib/openai-server";

const BG_URLS = BACKGROUND_PRESETS.map((p) => p.url);

export type OpenAiFlowResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

function apiFail(status: number, message: string): OpenAiFlowResult<never> {
  return { ok: false, status, message };
}

function shapeFail(message: string): OpenAiFlowResult<never> {
  return { ok: false, status: 502, message };
}

function resolveBackgroundUrl(raw: unknown): string {
  const u = typeof raw === "string" ? raw.trim() : "";
  if (BG_URLS.includes(u)) return u;
  return BACKGROUND_PRESETS[3]!.url;
}

function normSlide(s: unknown): { title: string; lines: string[] } | null {
  if (!s || typeof s !== "object") return null;
  const o = s as { title?: unknown; lines?: unknown };
  const title = String(o.title ?? "Slide").slice(0, 200);
  const lines = Array.isArray(o.lines)
    ? o.lines.map((l) => String(l).trim()).filter((l) => l.length > 0).slice(0, 12)
    : [];
  if (!lines.length) return null;
  return { title, lines };
}

export async function tryOpenAIBridge(
  cfg: OpenAIConfig,
  prompt: string,
): Promise<
  OpenAiFlowResult<{
    lines: string[];
    slideSuggestions: { title: string; lines: string[] }[];
    note: string;
    echo: string;
  }>
> {
  const out = await openaiJsonCompletion<Record<string, unknown>>(
    cfg,
    `You help worship leaders write original bridge lyrics (not copyrighted existing songs) and suggest how to split them for on-screen slides.`,
    `Theme / direction from the worship leader:\n"""${prompt.slice(0, 2000)}"""\n\nReturn JSON with keys:
- lines: array of 4–8 short singable lines (strings)
- slideSuggestions: array of 2–5 objects { "title": string, "lines": string[] } with 1–2 lines each for projection
- note: one sentence describing what you wrote
- echo: very short restatement of their theme`,
  );
  if (!out.ok) return apiFail(out.status, out.error);
  const d = out.data;
  const lines = Array.isArray(d.lines) ? d.lines.map((x) => String(x).trim()).filter(Boolean) : [];
  const slideSuggestions = Array.isArray(d.slideSuggestions)
    ? d.slideSuggestions.map(normSlide).filter((x): x is NonNullable<typeof x> => x !== null)
    : [];
  const note = typeof d.note === "string" ? d.note.slice(0, 500) : "";
  const echo = typeof d.echo === "string" ? d.echo.slice(0, 200) : prompt.slice(0, 160);
  if (lines.length < 2 || slideSuggestions.length < 1) {
    return shapeFail("OpenAI returned bridge content in an unexpected shape. Try again or shorten your prompt.");
  }
  return {
    ok: true,
    data: {
      lines,
      slideSuggestions,
      note: note || "Generated with OpenAI.",
      echo,
    },
  };
}

export async function tryOpenAISongPresent(
  cfg: OpenAIConfig,
  input: { title: string; lyrics: string; artist: string },
): Promise<
  OpenAiFlowResult<{
    slides: { title: string; lines: string[] }[];
    backgroundUrl: string;
    structure: string;
    note: string;
  }>
> {
  const allow = BG_URLS.join("\n");
  const out = await openaiJsonCompletion<Record<string, unknown>>(
    cfg,
    `You only rearrange text the user pasted into projector slides. CRITICAL: Do NOT invent, complete, paraphrase, or recall lyrics from memory. Every line in every slide must appear verbatim in the user's Lyrics block (whitespace trimming only). If something is missing from their paste, do not add it. Use at most 2 lines per slide when it aids readability. Pick backgroundUrl EXACTLY from this allowlist:\n${allow}`,
    `Context (not extra lyrics—title/artist for slide titles only):
Title: ${input.title.slice(0, 200)}
Artist: ${input.artist.slice(0, 120)}

Lyrics to split (verbatim source—your output may only use words from here):
"""${input.lyrics.slice(0, 12000)}"""

Return JSON:
- slides: array of { "title": string, "lines": string[] } in order; titles may include section names from markers like [Chorus]
- backgroundUrl: string (exactly one URL from allowlist)
- structure: short summary e.g. "Verse / Chorus / Bridge"
- note: one sentence reminding the leader to verify against their licensed source`,
  );
  if (!out.ok) return apiFail(out.status, out.error);
  const d = out.data;
  const slides = Array.isArray(d.slides)
    ? d.slides.map(normSlide).filter((x): x is NonNullable<typeof x> => x !== null)
    : [];
  if (slides.length < 1) {
    return shapeFail("OpenAI did not return usable slides for this song. Try again or add clearer section markers in the lyrics.");
  }
  const backgroundUrl = resolveBackgroundUrl(d.backgroundUrl);
  const structure =
    typeof d.structure === "string" ? d.structure.slice(0, 200) : "Sections";
  const note = typeof d.note === "string" ? d.note.slice(0, 500) : "";
  return {
    ok: true,
    data: {
      slides,
      backgroundUrl,
      structure,
      note: note || "Song layout suggested with OpenAI — review before service.",
    },
  };
}

/** Topic-style queries: model returns reference + slide lines (verify wording against your licensed Bible). */
export async function tryOpenAIScriptureTopic(
  cfg: OpenAIConfig,
  query: string,
  translationLabel: string,
): Promise<
  OpenAiFlowResult<{ ref: string; slides: { title: string; lines: string[] }[]; note: string }>
> {
  const out = await openaiJsonCompletion<Record<string, unknown>>(
    cfg,
    `You help churches display Scripture on slides. Prefer wording consistent with common ${translationLabel} phrasing when you know it; otherwise say so in the note. Never invent verse numbers — cite a real reference. Split text into short lines for projection.`,
    `Theme or question:\n"""${query.slice(0, 800)}"""\n\nReturn JSON:
- ref: string (e.g. "Romans 15:13")
- slides: array of { "title": string, "lines": string[] } with 1–2 lines per slide
- note: string (include a reminder to verify text against an official ${translationLabel} source if needed)`,
  );
  if (!out.ok) return apiFail(out.status, out.error);
  const d = out.data;
  const ref = typeof d.ref === "string" ? d.ref.trim().slice(0, 120) : "";
  const slides = Array.isArray(d.slides)
    ? d.slides.map(normSlide).filter((x): x is NonNullable<typeof x> => x !== null)
    : [];
  const note = typeof d.note === "string" ? d.note.slice(0, 500) : "";
  if (!ref || slides.length < 1) {
    return shapeFail("OpenAI did not return usable scripture slides. Try rephrasing your topic.");
  }
  return {
    ok: true,
    data: {
      ref,
      slides,
      note: note || "OpenAI draft — verify wording with your Bible translation.",
    },
  };
}

export async function tryOpenAICustomSetlistBlock(
  cfg: OpenAIConfig,
  input: { kind: CustomSetlistBlockKind; prompt: string; contentMode: "ai_text" | "user_text" },
): Promise<
  OpenAiFlowResult<{
    backgroundUrl: string;
    slides: { title: string; lines: string[] }[];
    itemTypography: SlideTypography;
    note: string;
  }>
> {
  const allow = BG_URLS.join("\n");
  const typo: SlideTypography = input.kind === "prayer" ? "editorial" : "default";

  if (input.contentMode === "user_text") {
    const out = await openaiJsonCompletion<Record<string, unknown>>(
      cfg,
      `Pick a worship-appropriate stock background for a setlist block. backgroundUrl must be EXACTLY one of:\n${allow}`,
      `Block kind: ${input.kind}. User hint: """${input.prompt.slice(0, 400)}"""
Return JSON: { "backgroundUrl": string (from allowlist), "note": string }`,
    );
    if (!out.ok) return apiFail(out.status, out.error);
    return {
      ok: true,
      data: {
        backgroundUrl: resolveBackgroundUrl(out.data.backgroundUrl),
        slides: [{ title: "Slide 1", lines: [""] }],
        itemTypography: typo,
        note:
          (typeof out.data.note === "string" ? out.data.note : "Background only — add your text.") ||
          "Background only — add your text.",
      },
    };
  }

  const out = await openaiJsonCompletion<Record<string, unknown>>(
    cfg,
    `You write short on-screen lines for church services (prayer, reflective moment, or announcements). Keep lines readable at a distance. backgroundUrl must be EXACTLY one URL from:\n${allow}`,
    `kind: ${input.kind} (prayer | moment | other)
prompt: """${input.prompt.slice(0, 600)}"""

Return JSON:
- backgroundUrl: string (from allowlist)
- slides: array of { "title": string, "lines": string[] } — 2–6 slides, 1–2 lines each
- note: string`,
  );
  if (!out.ok) return apiFail(out.status, out.error);
  const d = out.data;
  const slides = Array.isArray(d.slides)
    ? d.slides.map(normSlide).filter((x): x is NonNullable<typeof x> => x !== null)
    : [];
  if (slides.length < 1) {
    return shapeFail("OpenAI did not return usable slides for this block. Try again with a clearer prompt.");
  }
  return {
    ok: true,
    data: {
      backgroundUrl: resolveBackgroundUrl(d.backgroundUrl),
      slides,
      itemTypography: typo,
      note:
        (typeof d.note === "string" ? d.note.slice(0, 500) : "") ||
        "OpenAI draft — edit before service.",
    },
  };
}

function normVerseSuggestion(s: unknown): VerseSuggestion | null {
  if (!s || typeof s !== "object") return null;
  const o = s as { ref?: unknown; text?: unknown; blurb?: unknown };
  const ref = typeof o.ref === "string" ? o.ref.trim().slice(0, 120) : "";
  const text = typeof o.text === "string" ? o.text.trim().slice(0, 4000) : "";
  const blurb = typeof o.blurb === "string" ? o.blurb.trim().slice(0, 400) : "";
  if (!ref || !text) return null;
  return { ref, text, blurb: blurb || ref };
}

/** Bible / Present “verse options” from a free-form topic. */
export async function tryOpenAIBibleSuggest(
  cfg: OpenAIConfig,
  topic: string,
  translationLabel: string,
): Promise<OpenAiFlowResult<VerseSuggestion[]>> {
  const out = await openaiJsonCompletion<Record<string, unknown>>(
    cfg,
    `You suggest Bible passages for worship and teaching. Use real references. For each item include ref, text (wording aligned with common ${translationLabel} style when you know it), and a short blurb. Tell the user to verify against their licensed Bible.`,
    `Topic or question:\n"""${topic.slice(0, 280)}"""\n\nReturn JSON: { "suggestions": [ { "ref": string, "text": string, "blurb": string } ] }\nProvide 4–8 suggestions.`,
  );
  if (!out.ok) return apiFail(out.status, out.error);
  const raw = out.data.suggestions;
  const list = Array.isArray(raw) ? raw.map(normVerseSuggestion).filter((x): x is VerseSuggestion => x !== null) : [];
  if (list.length < 1) {
    return shapeFail("OpenAI did not return verse suggestions in the expected format.");
  }
  return { ok: true, data: list };
}

/** Slide Studio / paste pipeline: intelligent section-aware splits for projection. */
export async function tryOpenAILyricsSplit(
  cfg: OpenAIConfig,
  input: { lyrics: string; title: string; maxLinesPerSlide: number },
): Promise<
  OpenAiFlowResult<{
    slides: { title: string; lines: string[] }[];
    structure: string;
    note: string;
  }>
> {
  const max = Math.min(4, Math.max(2, Math.floor(input.maxLinesPerSlide)));
  const out = await openaiJsonCompletion<Record<string, unknown>>(
    cfg,
    `You split pasted worship lyrics into slides only. Do NOT invent or import lines from memory—every line must come verbatim from the lyrics block. Honor [Verse 1], [Chorus], [Bridge]. Titles may include section names. At most ${max} lines per slide. Include every pasted line once, in order, no duplicates.`,
    `Song title (context only): ${input.title.trim().slice(0, 120) || "Untitled"}

Lyrics:
"""${input.lyrics.slice(0, 14000)}"""

Return JSON:
- slides: [ { "title": string, "lines": string[] } ] in order from start to end of song
- structure: short summary e.g. "V1 / Chorus / V2 / Chorus / Bridge"
- note: one sentence for the worship leader`,
  );
  if (!out.ok) return apiFail(out.status, out.error);
  const d = out.data;
  const slides = Array.isArray(d.slides)
    ? d.slides.map(normSlide).filter((x): x is NonNullable<typeof x> => x !== null)
    : [];
  const structure =
    typeof d.structure === "string" ? d.structure.slice(0, 200) : "Custom";
  const note = typeof d.note === "string" ? d.note.slice(0, 500) : "";
  if (slides.length < 1) {
    return shapeFail("OpenAI did not return slides. Try shorter lyrics or add [Verse]/[Chorus] markers.");
  }
  return {
    ok: true,
    data: {
      slides,
      structure,
      note: note || "Lyrics split with OpenAI — review before saving to Songs.",
    },
  };
}

