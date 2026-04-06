export type SongPresentPayload = {
  slides: { title: string; lines: string[] }[];
  backgroundUrl?: string;
  structure?: string;
  note?: string;
};

export type FetchSongPresentOutcome =
  | { ok: true; data: SongPresentPayload }
  | { ok: false; error: string };

/** Calls presentation AI (OpenAI when configured). */
export async function fetchSongPresentStyling(
  title: string,
  lyrics: string,
  artist = "",
): Promise<FetchSongPresentOutcome> {
  try {
    const res = await fetch("/api/ai/song-present", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, lyrics, artist }),
    });
    const raw = (await res.json()) as {
      error?: string;
      slides?: unknown;
      backgroundUrl?: string;
      structure?: string;
      note?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error:
          typeof raw.error === "string"
            ? raw.error
            : `Could not generate slides (${res.status}).`,
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
      .filter((x): x is { title: string; lines: string[] } => x !== null);
    if (!slides.length) {
      return { ok: false, error: "Server returned invalid slide data." };
    }
    return {
      ok: true,
      data: {
        slides,
        backgroundUrl: typeof raw.backgroundUrl === "string" ? raw.backgroundUrl : undefined,
        structure: typeof raw.structure === "string" ? raw.structure : undefined,
        note: typeof raw.note === "string" ? raw.note : undefined,
      },
    };
  } catch {
    return { ok: false, error: "Network error — check your connection." };
  }
}
