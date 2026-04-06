import type { OpenAIConfig } from "@/lib/openai-server";
import { getOpenAIConfig } from "@/lib/openai-server";

/** Pull a short message out of OpenAI’s JSON error body (or return a trimmed raw snippet). */
export function summarizeOpenAiErrorBody(raw: string): string {
  const t = raw.trim();
  if (!t) return "The AI service returned an empty error.";
  try {
    const j = JSON.parse(t) as {
      error?: { message?: string; code?: string; type?: string };
    };
    const msg = j.error?.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  } catch {
    /* not JSON */
  }
  return t.length > 280 ? `${t.slice(0, 280)}…` : t;
}

/** Set to `1` or `true` to allow built-in preview data when `OPENAI_API_KEY` is missing (development only). */
export function allowDummyAi(): boolean {
  const v = process.env.AI_ALLOW_DUMMY?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export type AiRuntimeMode = "live" | "dummy" | "unconfigured";

export function getAiRuntimeMode():
  | { mode: "live"; cfg: OpenAIConfig }
  | { mode: "dummy"; cfg: null }
  | { mode: "unconfigured"; cfg: null } {
  const cfg = getOpenAIConfig();
  if (cfg) return { mode: "live", cfg };
  if (allowDummyAi()) return { mode: "dummy", cfg: null };
  return { mode: "unconfigured", cfg: null };
}

export function aiNotConfiguredResponse(): Response {
  return Response.json(
    {
      error:
        "Smart replies aren’t enabled on this server yet. If you’re trying the app locally or self-hosting, add your AI API key in environment settings and restart the app. Use Settings in the sidebar for a short guide.",
      code: "AI_NOT_CONFIGURED",
    },
    { status: 503 },
  );
}

export function openAiFailedResponse(hint?: string): Response {
  const dev = process.env.NODE_ENV === "development";
  return Response.json(
    {
      error:
        hint ??
        "The AI service didn’t return a usable answer. Check your API key and billing, or try again with a shorter question.",
      code: "AI_OPENAI_FAILED",
      ...(dev && hint ? { details: hint.slice(0, 600) } : {}),
    },
    { status: 502 },
  );
}

export function openAiHttpFailedResponse(status: number, bodySnippet: string): Response {
  const dev = process.env.NODE_ENV === "development";
  const summary = summarizeOpenAiErrorBody(bodySnippet);
  return Response.json(
    {
      error: summary,
      code: "AI_OPENAI_HTTP_ERROR",
      httpStatus: status,
      ...(dev ? { details: bodySnippet.slice(0, 1200) } : {}),
    },
    { status: 502 },
  );
}

/** Map OpenAI flow errors (HTTP or bad JSON shape) to a client response. */
export function openAiFlowFailedResponse(r: { ok: false; status: number; message: string }): Response {
  return openAiHttpFailedResponse(r.status, r.message);
}
