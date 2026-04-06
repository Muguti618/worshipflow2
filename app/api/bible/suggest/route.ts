import { AI_DUMMY_META } from "@/lib/ai-dummy-data";
import { aiNotConfiguredResponse, getAiRuntimeMode, openAiFlowFailedResponse } from "@/lib/ai-route-gate";
import { aiMetaForRequest } from "@/lib/ai-response-meta";
import { type BibleTranslationKey, BIBLE_TRANSLATIONS } from "@/lib/bible-lookup";
import { suggestVersesForTopic } from "@/lib/bible-topic-suggestions";
import { tryOpenAIBibleSuggest } from "@/lib/openai-worship-flows";
import { proRequiredForFeatureResponse, sessionMayUseProAiApis } from "@/lib/plan-server";

function isTranslationKey(x: string): x is BibleTranslationKey {
  return x in BIBLE_TRANSLATIONS;
}

export async function POST(req: Request) {
  let body: { topic?: string; translation?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const topic = (body.topic ?? "").trim();
  if (!topic) {
    return Response.json({ error: "topic required" }, { status: 400 });
  }
  if (topic.length > 280) {
    return Response.json({ error: "topic too long" }, { status: 400 });
  }

  const tr = body.translation?.trim() ?? "NIV";
  const translation: BibleTranslationKey = isTranslationKey(tr) ? tr : "NIV";
  const translationLong = tr;

  if (!(await sessionMayUseProAiApis())) return proRequiredForFeatureResponse();

  const { mode, cfg } = getAiRuntimeMode();
  if (mode === "unconfigured") return aiNotConfiguredResponse();
  if (mode === "dummy") {
    const suggestions = suggestVersesForTopic(topic, translation);
    return Response.json({
      suggestions,
      note: "Curated suggestions for common themes (offline preview). Set OPENAI_API_KEY for open-ended topics.",
      meta: AI_DUMMY_META,
    });
  }

  const r = await tryOpenAIBibleSuggest(cfg, topic, translationLong);
  if (!r.ok) return openAiFlowFailedResponse(r);
  return Response.json({
    suggestions: r.data,
    note: "Suggested by OpenAI — verify wording with your licensed Bible.",
    meta: aiMetaForRequest(cfg),
  });
}
