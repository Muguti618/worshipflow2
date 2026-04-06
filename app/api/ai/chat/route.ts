import { AI_DUMMY_META, getDummyAiChatReply } from "@/lib/ai-dummy-data";
import { aiNotConfiguredResponse, getAiRuntimeMode, openAiHttpFailedResponse } from "@/lib/ai-route-gate";
import { aiMetaForRequest } from "@/lib/ai-response-meta";
import { proRequiredForFeatureResponse, sessionMayUseProAiApis } from "@/lib/plan-server";
import type { ChatMessage } from "@/lib/openai-server";
import { openaiTextChat } from "@/lib/openai-server";

const MAX_MESSAGES = 24;
const MAX_CONTENT = 8000;

type ClientMsg = { role?: string; content?: unknown };

export async function POST(req: Request) {
  if (!(await sessionMayUseProAiApis())) return proRequiredForFeatureResponse();
  let body: { messages?: ClientMsg[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const trimmed = raw.slice(-MAX_MESSAGES);
  const messages: ChatMessage[] = [];
  let total = 0;
  for (const m of trimmed) {
    const role = m.role === "user" || m.role === "assistant" ? m.role : null;
    const content = typeof m.content === "string" ? m.content.slice(0, MAX_CONTENT) : "";
    if (!role || !content.trim()) continue;
    total += content.length;
    if (total > MAX_CONTENT * 2) break;
    messages.push({ role, content });
  }

  if (messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const { mode, cfg } = getAiRuntimeMode();
  if (mode === "unconfigured") return aiNotConfiguredResponse();
  if (mode === "dummy") {
    const { text, tag } = getDummyAiChatReply(lastUser);
    return Response.json({
      text,
      tag,
      meta: AI_DUMMY_META,
    });
  }

  const system: ChatMessage = {
    role: "system",
    content:
      "You are worshipflow2’s assistant for worship teams. Help with slides (multiple slides per song), setlists, presenting, backgrounds, and planning. Use **markdown bold** sparingly. Be concise and practical. Do not claim to access the user’s files or account.",
  };
  const out = await openaiTextChat(cfg, [system, ...messages]);
  if (!out.ok) return openAiHttpFailedResponse(out.status, out.error);
  return Response.json({
    text: out.content,
    tag: "assistant",
    meta: aiMetaForRequest(cfg),
  });
}