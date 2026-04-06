import type { CustomSetlistBlockKind } from "@/lib/ai-dummy-data";
import type { SlideTypography } from "@/lib/setlists-catalog";

export type CustomSetlistBlockAiPayload = {
  backgroundUrl: string;
  slides: { title: string; lines: string[] }[];
  itemTypography: SlideTypography;
  note?: string;
};

export type FetchCustomSetlistBlockOutcome =
  | { ok: true; data: CustomSetlistBlockAiPayload }
  | { ok: false; error: string };

export async function fetchCustomSetlistBlockAi(
  kind: CustomSetlistBlockKind,
  prompt: string,
  contentMode: "ai_text" | "user_text",
): Promise<FetchCustomSetlistBlockOutcome> {
  try {
    const res = await fetch("/api/ai/custom-setlist-block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, prompt, contentMode }),
    });
    const data = (await res.json()) as {
      error?: string;
      backgroundUrl?: unknown;
      slides?: unknown;
      itemTypography?: unknown;
      note?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error:
          typeof data.error === "string"
            ? data.error
            : `Could not load block AI (${res.status}).`,
      };
    }
    const backgroundUrl =
      typeof data.backgroundUrl === "string" ? data.backgroundUrl : "";
    if (!backgroundUrl) return { ok: false, error: "Server returned no background." };
    if (!Array.isArray(data.slides) || data.slides.length === 0) {
      return { ok: false, error: "Server returned no slides." };
    }
    const typo =
      data.itemTypography === "editorial" || data.itemTypography === "default"
        ? data.itemTypography
        : "default";
    const slides = data.slides
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const o = s as { title?: unknown; lines?: unknown };
        const lines = Array.isArray(o.lines) ? o.lines.map((l) => String(l)) : [];
        return { title: String(o.title ?? "Slide"), lines };
      })
      .filter((x): x is { title: string; lines: string[] } => x !== null);
    if (!slides.length) return { ok: false, error: "Invalid slide data from server." };
    return {
      ok: true,
      data: {
        backgroundUrl,
        slides,
        itemTypography: typo,
        note: typeof data.note === "string" ? data.note : undefined,
      },
    };
  } catch {
    return { ok: false, error: "Network error — check your connection." };
  }
}
