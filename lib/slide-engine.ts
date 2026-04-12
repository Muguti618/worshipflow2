/**
 * Client-side slide helpers (MVP). Replace section detection with an LLM later.
 */

export type SectionKind =
  | "Verse"
  | "Chorus"
  | "Bridge"
  | "Tag"
  | "Intro"
  | "Outro"
  | "Section";

const SECTION_RE =
  /^\s*\[?\s*(verse|chorus|bridge|tag|intro|outro)\s*(\d+)?\s*\]?\s*:?\s*$/i;
const SECTION_RE2 = /^\s*(verse|chorus|bridge)\s+\d+\s*:?\s*$/i;

function normalizeLabel(s: string): SectionKind {
  const k = s.toLowerCase();
  if (k.startsWith("verse")) return "Verse";
  if (k.startsWith("chorus")) return "Chorus";
  if (k.startsWith("bridge")) return "Bridge";
  if (k.startsWith("tag")) return "Tag";
  if (k.startsWith("intro")) return "Intro";
  if (k.startsWith("outro")) return "Outro";
  return "Section";
}

/** Split raw lyrics into labeled sections using [Chorus], Verse 1:, blank lines, etc. */
export function smartSplitSections(raw: string): { label: SectionKind; lines: string[] }[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const blocks = text.split(/\n\s*\n+/);
  const out: { label: SectionKind; lines: string[] }[] = [];
  let currentLabel: SectionKind = "Verse";
  let buf: string[] = [];

  const flush = () => {
    if (buf.length === 0) return;
    out.push({ label: currentLabel, lines: buf.map((l) => l.trim()).filter(Boolean) });
    buf = [];
  };

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trimEnd());
    const first = lines[0]?.trim() ?? "";
    let rest = lines;

    let m = first.match(SECTION_RE);
    if (!m) m = first.match(SECTION_RE2);
    if (m) {
      flush();
      currentLabel = normalizeLabel(m[1] ?? "section");
      rest = lines.slice(1);
    }

    for (const line of rest) {
      const t = line.trim();
      if (!t) continue;
      const hm = t.match(SECTION_RE) ?? t.match(SECTION_RE2);
      if (hm && t.length < 48) {
        flush();
        currentLabel = normalizeLabel(hm[1] ?? "section");
        continue;
      }
      buf.push(line);
    }
    flush();
  }

  if (out.length === 0 && text.length > 0) {
    return [{ label: "Verse", lines: text.split("\n").map((l) => l.trim()).filter(Boolean) }];
  }
  return out.filter((s) => s.lines.length > 0);
}

/**
 * 2–4 line rule: pack lines into slides (default max 3 lines per slide).
 */
export function chunkToSlides(lines: string[], maxLinesPerSlide = 3): string[][] {
  if (lines.length === 0) return [];
  const max = Math.min(4, Math.max(2, maxLinesPerSlide));
  const out: string[][] = [];
  let i = 0;
  while (i < lines.length) {
    const rem = lines.length - i;
    let n = Math.min(max, rem);
    if (rem === 4 && max >= 3) n = 2;
    else if (rem === 5 && max >= 3) n = 3;
    else if (rem === 7 && max >= 3) n = 3;
    out.push(lines.slice(i, i + n));
    i += n;
  }
  return out;
}

export type SlideCard = { title: string; lines: string[] };

/** Full pipeline: paste → sections → slide cards with 2–4 lines each */
export function lyricsToSlideCards(raw: string, maxLinesPerSlide = 3): SlideCard[] {
  const sections = smartSplitSections(raw);
  const cards: SlideCard[] = [];
  for (const sec of sections) {
    const chunks = chunkToSlides(sec.lines, maxLinesPerSlide);
    for (const lines of chunks) {
      cards.push({ title: sec.label, lines });
    }
  }
  return cards;
}

/**
 * Quick beam / spontaneous: prepend one `song-title` layout slide so the name is big and bold.
 * Setlist songs use `prependSongTitleCard` at present time instead — do not duplicate in library slides.
 */
export function withLeadingSongTitleSlide<T extends { title: string; lines: string[] }>(
  slides: T[],
  songTitle: string,
): T[] {
  const t = songTitle.trim();
  if (!t) return slides;
  const mapped = slides.map((s) => ({
    ...s,
    lines: [...s.lines],
  })) as T[];
  const first = mapped[0];
  if (first) {
    const body = first.lines.map((l) => l.trimEnd()).filter((l) => l.length > 0);
    if (body.length === 1 && body[0]!.toLowerCase() === t.toLowerCase()) {
      return [
        { ...first, title: "", lines: [t], layout: "song-title" as const },
        ...mapped.slice(1),
      ] as unknown as T[];
    }
  }
  const lead = { title: "", lines: [t], layout: "song-title" as const } as unknown as T;
  return [lead, ...mapped];
}

/** Long scripture → readable slide chunks (sentence-ish, capped lines). */
export function scriptureToSlideCards(ref: string, text: string): SlideCard[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lines: string[] = [];
  let buf = "";
  for (const p of parts) {
    if ((buf + " " + p).trim().length > 120 && buf) {
      lines.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? `${buf} ${p}` : p;
    }
  }
  if (buf.trim()) lines.push(buf.trim());
  const chunks = chunkToSlides(lines, 3);
  return chunks.map((l) => ({ title: ref, lines: l }));
}
