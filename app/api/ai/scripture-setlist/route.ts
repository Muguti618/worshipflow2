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

type ScriptureOption = {
  ref: string;
  slides: { title: string; lines: string[] }[];
  blurb?: string;
};

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
    if (r) {
      const cards = scriptureToSlideCards(r.ref, r.text);
      const slides = cards.map((c) => ({ title: c.title, lines: [...c.lines] }));
      return Response.json({
        ref: r.ref,
        slides,
        note: "Bundled sample passage text for preview and slide layout.",
        meta: LOCAL_SCRIPTURE_SAMPLE_META,
      });
    }
    /* Reference-shaped but not in bundled set — continue to AI / topic flow below. */
  }

  if (!(await sessionMayUseProAiApis())) return proRequiredForFeatureResponse();

  const { mode, cfg } = getAiRuntimeMode();
  if (mode === "unconfigured") return aiNotConfiguredResponse();

  const local = suggestVersesForTopic(query, translation).slice(0, 5);
  const localOptions: ScriptureOption[] = local.map((s) => {
    const cards = scriptureToSlideCards(s.ref, s.text);
    const slides = cards.map((c) => ({ title: c.title, lines: [...c.lines] }));
    return { ref: s.ref, slides, blurb: s.blurb };
  });

  if (mode === "dummy") {
    if (localOptions.length === 0) {
      return Response.json({
        options: [],
        note: `${AI_DUMMY_META.modelLabel} — no topic match found. Try a different keyword, or paste a reference like “John 3:16”.`,
        meta: AI_DUMMY_META,
      });
    }
    return Response.json({
      options: localOptions,
      note: `${AI_DUMMY_META.modelLabel} — pick a passage and review the slides before adding it.`,
      meta: AI_DUMMY_META,
    });
  }

  const meta = aiMetaForRequest(cfg);
  const aiPick = await tryOpenAIScriptureTopic(cfg, query, translationLong);
  if (!aiPick.ok) return openAiFlowFailedResponse(aiPick);

  const aiRef = (aiPick.data.ref ?? "").trim();
  const aiSlides = Array.isArray(aiPick.data.slides) ? aiPick.data.slides : [];
  const aiUsable = Boolean(aiRef && aiSlides.length > 0);

  const options: ScriptureOption[] = [
    ...(aiUsable
      ? [{ ref: aiRef, slides: aiSlides, blurb: aiPick.data.note || "AI pick" }]
      : []),
    ...localOptions.filter((o) => o.ref !== aiRef),
  ];

  if (options.length === 0) {
    return Response.json({
      options: [],
      note: "No scripture options found for that topic. Try a different keyword, or paste a reference like “John 3:16”.",
      meta,
    });
  }

  return Response.json({
    options,
    note: "Pick a passage, then review the slides before adding it to your setlist.",
    meta,
  });
}
