import { AI_DUMMY_META } from "@/lib/ai-dummy-data";
import type { OpenAIConfig } from "@/lib/openai-server";

export type AiResponseMeta = {
  mode: string;
  modelLabel: string;
  latencyMsSimulated: number;
};

export function aiMetaForRequest(cfg: OpenAIConfig | null): AiResponseMeta {
  if (!cfg) return { ...AI_DUMMY_META };
  return {
    mode: "openai",
    modelLabel: cfg.model,
    latencyMsSimulated: 0,
  };
}

/** Reference-style scripture uses in-app sample lookup (not OpenAI). */
export const LOCAL_SCRIPTURE_SAMPLE_META: AiResponseMeta = {
  mode: "local-sample",
  modelLabel: "Bundled sample passages",
  latencyMsSimulated: 0,
};
