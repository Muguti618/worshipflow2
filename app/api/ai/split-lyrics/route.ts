import { AI_DUMMY_META } from "@/lib/ai-dummy-data";
import {
  aiNotConfiguredResponse,
  getAiRuntimeMode,
  openAiFlowFailedResponse,
} from "@/lib/ai-route-gate";
import { aiMetaForRequest } from "@/lib/ai-response-meta";
import { lyricsToSlideCards } from "@/lib/slide-engine";
import { tryOpenAILyricsSplit } from "@/lib/openai-worship-flows";
import { proRequiredForFeatureResponse, sessionMayUseProAiApis } from "@/lib/plan-server";

/**
 * AI-aware lyrics → slides for Slide Studio (and similar UIs).
 * Dummy mode uses the same rule-based engine as the local preview.
 */
export async function POST(req: Request) {
  if (!(await sessionMayUseProAiApis())) return proRequiredForFeatureResponse();
  let body: { lyrics?: string; title?: string; maxLinesPerSlide?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lyrics = typeof body.lyrics === "string" ? body.lyrics : "";
  if (!lyrics.trim()) {
    return Response.json({ error: "lyrics required" }, { status: 400 });
  }
  if (lyrics.length > 16000) {
    return Response.json({ error: "lyrics too long (max 16000 chars)" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const m = Number(body.maxLinesPerSlide);
  const maxLinesPerSlide = Number.isFinite(m) ? Math.min(4, Math.max(2, Math.floor(m))) : 3;

  const { mode, cfg } = getAiRuntimeMode();
  if (mode === "unconfigured") return aiNotConfiguredResponse();

  if (mode === "dummy") {
    const cards = lyricsToSlideCards(lyrics, maxLinesPerSlide);
    return Response.json({
      slides: cards.map((c) => ({ title: c.title, lines: [...c.lines] })),
      structure: "Rule-based splitter (preview)",
      note: "Same logic as the local “max lines / slide” preview. Add OPENAI_API_KEY for AI splitting.",
      meta: AI_DUMMY_META,
    });
  }

  const r = await tryOpenAILyricsSplit(cfg, {
    lyrics,
    title,
    maxLinesPerSlide,
  });
  if (!r.ok) return openAiFlowFailedResponse(r);
  return Response.json({
    slides: r.data.slides,
    structure: r.data.structure,
    note: r.data.note,
    meta: aiMetaForRequest(cfg),
  });
}
