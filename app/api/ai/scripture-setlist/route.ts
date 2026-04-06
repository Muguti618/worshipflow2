import { AI_DUMMY_META } from "@/lib/ai-dummy-data";
import {
  aiNotConfiguredResponse,
  getAiRuntimeMode,
  openAiFlowFailedResponse,
} from "@/lib/ai-route-gate";
import {
  aiMetaForRequest,
  LOCAL_SCRIPTURE_SAMPLE_META,
} from "@/lib/ai-response-meta";
import {
  BIBLE_TRANSLATIONS,
  lookupScripture,
  type BibleTranslationKey,
} from "@/lib/bible-lookup";
import { suggestVersesForTopic } from "@/lib/bible-topic-suggestions";
import { tryOpenAIScriptureTopic } from "@/lib/openai-worship-flows";
import { scriptureToSlideCards } from "@/lib/slide-engine";
import { proRequiredForFeatureResponse, sessionMayUseProAiApis } from "@/lib/plan-server";

function isTranslationKey(x: string): x is BibleTranslationKey {
  return x in BIBLE_TRANSLATIONS;
}

function looksLikeReferenceQuery(q: string): boolean {
  const t = q.trim();
  if (t.length < 3 || t.length > 120) return false;
  if (/\d/.test(t) && /[:.,]/.test(t)) return true;
  if (/^[1-3]?\s*[a-z]{2,}\s+\d+/i.test(t)) return true;
  return false;
}

export async function POST(req: Request) {
  let body: { query?: string; translation?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) {
    return Response.json({ error: "query required" }, { status: 400 });
  }
  if (query.length > 400) {
    return Response.json({ error: "query too long" }, { status: 400 });
  }

  const tr = body.translation?.trim() ?? "NIV";
  const translation: BibleTranslationKey = isTranslationKey(tr) ? tr : "NIV";
  const translationLong = tr;

  if (looksLikeReferenceQuery(query)) {
    const r = lookupScripture(query, translation);
    const cards = scriptureToSlideCards(r.ref, r.text);
    const slides = cards.map((c) => ({ title: c.title, lines: [...c.lines] }));
    return Response.json({
      ref: r.ref,
      slides,
      note: "Sample wording from bundled passages — replace with your licensed translation for services.",
      meta: LOCAL_SCRIPTURE_SAMPLE_META,
    });
  }

  if (!(await sessionMayUseProAiApis())) return proRequiredForFeatureResponse();

  const { mode, cfg } = getAiRuntimeMode();
  if (mode === "unconfigured") return aiNotConfiguredResponse();
  if (mode === "dummy") {
    const sug = suggestVersesForTopic(query, translation)[0]!;
    const cards = scriptureToSlideCards(sug.ref, sug.text);
    const slides = cards.map((c) => ({ title: c.title, lines: [...c.lines] }));
    return Response.json({
      ref: sug.ref,
      slides,
      note: `${AI_DUMMY_META.modelLabel} — curated topic match: ${sug.blurb}`,
      meta: AI_DUMMY_META,
    });
  }

  const r = await tryOpenAIScriptureTopic(cfg, query, translationLong);
  if (!r.ok) return openAiFlowFailedResponse(r);
  return Response.json({
    ref: r.data.ref,
    slides: r.data.slides,
    note: r.data.note,
    meta: aiMetaForRequest(cfg),
  });
}
