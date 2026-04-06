import { AI_DUMMY_META, getDummyNewSongPresentation } from "@/lib/ai-dummy-data";
import {
  aiNotConfiguredResponse,
  getAiRuntimeMode,
  openAiFlowFailedResponse,
} from "@/lib/ai-route-gate";
import { aiMetaForRequest } from "@/lib/ai-response-meta";
import { LYRICS_REQUIRED_MESSAGE, MIN_LYRICS_CHARS_FOR_AI_SLIDES } from "@/lib/song-ai-policy";
import { tryOpenAISongPresent } from "@/lib/openai-worship-flows";
import { proRequiredForFeatureResponse, sessionMayUseSongPresentAi } from "@/lib/plan-server";

export async function POST(req: Request) {
  if (!(await sessionMayUseSongPresentAi())) return proRequiredForFeatureResponse();
  let body: { title?: string; lyrics?: string; artist?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return Response.json({ error: "title required" }, { status: 400 });
  }
  const lyrics = typeof body.lyrics === "string" ? body.lyrics : "";
  const artist = typeof body.artist === "string" ? body.artist : "";

  const { mode, cfg } = getAiRuntimeMode();
  if (mode === "unconfigured") return aiNotConfiguredResponse();
  if (mode === "dummy") {
    const payload = getDummyNewSongPresentation({ title, lyrics, artist });
    return Response.json({ ...payload, meta: AI_DUMMY_META });
  }

  if (lyrics.trim().length < MIN_LYRICS_CHARS_FOR_AI_SLIDES) {
    return Response.json(
      {
        error: LYRICS_REQUIRED_MESSAGE,
        code: "LYRICS_REQUIRED",
        minChars: MIN_LYRICS_CHARS_FOR_AI_SLIDES,
      },
      { status: 400 },
    );
  }

  const r = await tryOpenAISongPresent(cfg, { title, lyrics, artist });
  if (!r.ok) return openAiFlowFailedResponse(r);
  return Response.json({
    ...r.data,
    meta: aiMetaForRequest(cfg),
  });
}
