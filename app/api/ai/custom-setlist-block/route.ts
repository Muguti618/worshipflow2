import {
  AI_DUMMY_META,
  getDummyCustomSetlistBlock,
  type CustomSetlistBlockKind,
} from "@/lib/ai-dummy-data";
import {
  aiNotConfiguredResponse,
  getAiRuntimeMode,
  openAiFlowFailedResponse,
} from "@/lib/ai-route-gate";
import { aiMetaForRequest } from "@/lib/ai-response-meta";
import { tryOpenAICustomSetlistBlock } from "@/lib/openai-worship-flows";
import { proRequiredForFeatureResponse, sessionMayUseProAiApis } from "@/lib/plan-server";

function isKind(x: string): x is CustomSetlistBlockKind {
  return x === "prayer" || x === "moment" || x === "other";
}

export async function POST(req: Request) {
  if (!(await sessionMayUseProAiApis())) return proRequiredForFeatureResponse();
  let body: { kind?: string; prompt?: string; contentMode?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kindRaw = (body.kind ?? "").trim();
  if (!isKind(kindRaw)) {
    return Response.json({ error: "kind must be prayer, moment, or other" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (prompt.length > 400) {
    return Response.json({ error: "prompt too long" }, { status: 400 });
  }

  const cm = (body.contentMode ?? "user_text").trim();
  const contentMode = cm === "ai_text" ? "ai_text" : "user_text";

  const { mode, cfg } = getAiRuntimeMode();
  if (mode === "unconfigured") return aiNotConfiguredResponse();
  if (mode === "dummy") {
    const payload = getDummyCustomSetlistBlock({
      kind: kindRaw,
      prompt,
      contentMode,
    });
    return Response.json({ ...payload, meta: AI_DUMMY_META });
  }

  const r = await tryOpenAICustomSetlistBlock(cfg, {
    kind: kindRaw,
    prompt,
    contentMode,
  });
  if (!r.ok) return openAiFlowFailedResponse(r);
  return Response.json({
    ...r.data,
    meta: aiMetaForRequest(cfg),
  });
}
