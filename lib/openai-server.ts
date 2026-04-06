/**
 * Server-only OpenAI (ChatGPT) calls. Set OPENAI_API_KEY in .env.local.
 * Optional: OPENAI_MODEL (default gpt-4o-mini).
 */

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export type OpenAIConfig = { apiKey: string; model: string };

export function getOpenAIConfig(): OpenAIConfig | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  return { apiKey, model };
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

async function chatCompletion(
  cfg: OpenAIConfig,
  messages: ChatMessage[],
  options: {
    response_format?: { type: "json_object" };
    temperature?: number;
    max_tokens?: number;
  } = {},
): Promise<{ content: string } | { error: string; status: number }> {
  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: options.temperature ?? 0.55,
      max_tokens: options.max_tokens ?? 2048,
      ...(options.response_format ? { response_format: options.response_format } : {}),
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return { error: t.slice(0, 800) || res.statusText, status: res.status };
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  };
  const choice = data.choices?.[0];
  const content = choice?.message?.content?.trim() ?? "";
  if (!content) {
    const hint = choice?.finish_reason ? ` (finish_reason: ${choice.finish_reason})` : "";
    const raw = JSON.stringify(data).slice(0, 500);
    return {
      error: `OpenAI returned no message text${hint}. If this persists, try another model (OPENAI_MODEL). Raw: ${raw}`,
      status: 502,
    };
  }
  return { content };
}

/** Chat Completions with JSON object output (model must support it, e.g. gpt-4o-mini). */
export async function openaiJsonCompletion<T>(
  cfg: OpenAIConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const sys =
    systemPrompt +
    "\n\nYou must respond with a single valid JSON object only (no markdown fences).";

  const result = await chatCompletion(
    cfg,
    [
      { role: "system", content: sys },
      { role: "user", content: userPrompt },
    ],
    { response_format: { type: "json_object" }, temperature: 0.45, max_tokens: 4096 },
  );

  if ("error" in result) return { ok: false, error: result.error, status: result.status };

  try {
    const data = JSON.parse(result.content) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Model returned non-JSON", status: 502 };
  }
}

export async function openaiTextChat(
  cfg: OpenAIConfig,
  messages: ChatMessage[],
): Promise<{ ok: true; content: string } | { ok: false; error: string; status: number }> {
  const result = await chatCompletion(cfg, messages, { max_tokens: 1400, temperature: 0.65 });
  if ("error" in result) return { ok: false, error: result.error, status: result.status };
  return { ok: true, content: result.content };
}
