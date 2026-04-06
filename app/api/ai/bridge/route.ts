import { AI_DUMMY_META, getDummyBridgeResponse } from "@/lib/ai-dummy-data";
import {
  aiNotConfiguredResponse,
  getAiRuntimeMode,
  openAiFlowFailedResponse,
} from "@/lib/ai-route-gate";
import { aiMetaForRequest } from "@/lib/ai-response-meta";
import { tryOpenAIBridge } from "@/lib/openai-worship-flows";
import { proRequiredForFeatureResponse, sessionMayUseProAiApis } from "@/lib/plan-server";

export async function POST(req: Request) {
  if (!(await sessionMayUseProAiApis())) return proRequiredForFeatureResponse();
  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return Response.json({ error: "prompt required" }, { status: 400 });
  }

  const { mode, cfg } = getAiRuntimeMode();
  if (mode === "unconfigured") return aiNotConfiguredResponse();
  if (mode === "dummy") {
    const payload = getDummyBridgeResponse(prompt);
    return Response.json({ ...payload, meta: AI_DUMMY_META });
  }

  const r = await tryOpenAIBridge(cfg, prompt);
  if (!r.ok) return openAiFlowFailedResponse(r);
  return Response.json({
    ...r.data,
    meta: aiMetaForRequest(cfg),
  });
}
