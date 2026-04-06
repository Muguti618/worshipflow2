import { allowDummyAi } from "@/lib/ai-route-gate";
import { getOpenAIConfig } from "@/lib/openai-server";

/** Whether server-side AI is configured (no secrets exposed). */
export function GET() {
  const cfg = getOpenAIConfig();
  return Response.json({
    openaiConfigured: Boolean(cfg),
    model: cfg?.model ?? null,
    dummyFallbackAllowed: allowDummyAi(),
  });
}
