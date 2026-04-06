"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { AI_ASSISTANT_SEED, AI_DUMMY_META } from "@/lib/ai-dummy-data";

type Msg = { role: "user" | "assistant"; text: string; tag?: string };

type AiMeta = { mode: string; modelLabel: string; latencyMsSimulated: number };

function formatAiText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-wf-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const SEED: Msg[] = [{ role: "assistant", text: AI_ASSISTANT_SEED }];

const TRY_PROMPTS = [
  "How do multiple slides work per song?",
  "Suggest a verse about hope",
  "Help me with backgrounds for slides",
  "How do setlists connect to Present?",
];

export function AiAssistantPage() {
  const { limitsApply, ready: planReady } = usePlanEntitlements();
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastMeta, setLastMeta] = useState<AiMeta>({
    mode: AI_DUMMY_META.mode,
    modelLabel: AI_DUMMY_META.modelLabel,
    latencyMsSimulated: AI_DUMMY_META.latencyMsSimulated,
  });

  useEffect(() => {
    void fetch("/api/ai/status")
      .then((r) => r.json())
      .then(
        (j: { openaiConfigured?: boolean; model?: string | null; dummyFallbackAllowed?: boolean }) => {
          if (j.openaiConfigured && j.model) {
            setLastMeta({ mode: "openai", modelLabel: j.model, latencyMsSimulated: 0 });
          } else if (j.openaiConfigured) {
            setLastMeta({ mode: "openai", modelLabel: "OpenAI (default model)", latencyMsSimulated: 0 });
          } else if (j.dummyFallbackAllowed) {
            setLastMeta({ ...AI_DUMMY_META, mode: "preview-fallback (AI_ALLOW_DUMMY)" });
          } else {
            setLastMeta({
              mode: "not-configured",
              modelLabel: "Add OPENAI_API_KEY to .env.local",
              latencyMsSimulated: 0,
            });
          }
        },
      )
      .catch(() => {});
  }, []);

  const send = useCallback(async () => {
    const t = draft.trim();
    if (!t || loading) return;
    setDraft("");
    const userMsg: Msg = { role: "user", text: t };
    const thread = [...messages, userMsg];
    setMessages(thread);
    setLoading(true);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: thread.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const j = (await r.json()) as {
        text?: string;
        tag?: string;
        meta?: AiMeta;
        error?: string;
        details?: string;
        httpStatus?: number;
      };
      if (!r.ok) {
        let err =
          typeof j.error === "string"
            ? j.error
            : r.status === 503
              ? "AI is not configured on the server (missing OPENAI_API_KEY)."
              : `Request failed (${r.status}).`;
        if (typeof j.details === "string" && j.details.trim() && j.details !== j.error) {
          err = `${err}\n\nTechnical details:\n${j.details.trim()}`;
        }
        if (typeof j.httpStatus === "number" && j.httpStatus > 0) {
          err = `${err}\n\n(OpenAI HTTP ${j.httpStatus})`;
        }
        setMessages((m) => [...m, { role: "assistant", text: err, tag: "error" }]);
        return;
      }
      if (typeof j.text === "string" && j.text.length > 0) {
        const reply = j.text;
        const tag = typeof j.tag === "string" ? j.tag : undefined;
        setMessages((m) => [...m, { role: "assistant", text: reply, tag }]);
        if (j.meta?.modelLabel && j.meta.mode) {
          setLastMeta({
            mode: j.meta.mode,
            modelLabel: j.meta.modelLabel,
            latencyMsSimulated: j.meta.latencyMsSimulated ?? 0,
          });
        }
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: j.error ?? "Something went wrong. Try again.",
            tag: "error",
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Could not reach the server (offline?). Check your connection.",
          tag: "error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [draft, loading, messages]);

  if (planReady && limitsApply) {
    return (
      <div className="mx-auto max-w-lg p-6 lg:p-8">
        <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
        <p className="mt-3 text-sm leading-relaxed text-wf-muted">
          The in-app AI chat is not included on the Free plan. Upgrade to Pro to ask questions about slides,
          setlists, and workflow with ChatGPT-backed replies (when your server has{" "}
          <code className="rounded bg-white/[0.06] px-1 font-mono text-[11px]">OPENAI_API_KEY</code>
          ).
        </p>
        <Link
          href="/upgrade"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[14px] bg-gradient-to-r from-blue-600 to-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-900/25"
        >
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col p-6 lg:p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
        <p className="mt-1 text-sm text-wf-muted">
          Replies use <strong className="font-medium text-wf-text">ChatGPT</strong> when the server has{" "}
          <code className="rounded bg-white/[0.06] px-1 font-mono text-[11px]">OPENAI_API_KEY</code>. Without
          it, requests fail unless{" "}
          <code className="font-mono text-[11px]">AI_ALLOW_DUMMY=1</code> enables short preview replies. See{" "}
          <Link href="/tutorial" className="text-violet-300 hover:underline">
            Tutorial
          </Link>
          .
        </p>
        <p className="mt-2 rounded-[12px] border border-white/[0.06] bg-wf-bg/40 px-3 py-2 text-[11px] text-wf-muted">
          <span className="font-mono text-wf-text/90">{lastMeta.modelLabel}</span>
          <span className="mx-2 text-wf-muted/50">·</span>
          mode: <span className="font-mono text-wf-text/80">{lastMeta.mode}</span>
        </p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-[20px] border border-white/[0.08] bg-wf-card/40 backdrop-blur-xl">
        <div className="flex-1 space-y-4 overflow-auto p-5">
          {messages.map((msg, i) => (
            <div
              key={`${i}-${msg.text.slice(0, 12)}`}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-[16px] px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-blue-600/35 to-violet-600/35 text-wf-text"
                    : "flex flex-col gap-2 border border-white/[0.06] bg-wf-bg/50 text-wf-muted"
                }`}
              >
                {msg.role === "assistant" && msg.tag ? (
                  <span className="inline-flex w-fit rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200/90">
                    {msg.tag === "openai"
                      ? "ChatGPT"
                      : msg.tag === "error"
                        ? "Error"
                        : `Preview · ${msg.tag}`}
                  </span>
                ) : null}
                <div className="whitespace-pre-line">{formatAiText(msg.text)}</div>
              </div>
            </div>
          ))}
          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-[16px] border border-white/[0.06] bg-wf-bg/50 px-4 py-3 text-sm text-wf-muted">
                Thinking…
              </div>
            </div>
          ) : null}
        </div>
        <div className="border-t border-white/[0.06] p-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-wf-muted">
            Try (fills the box — then Send)
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {TRY_PROMPTS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setDraft(ex)}
                className="rounded-full border border-white/[0.08] bg-wf-bg/40 px-3 py-1 text-left text-xs text-wf-muted hover:border-violet-500/30 hover:text-wf-text"
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="Ask about slides (multi-slide songs), setlists, Bible, backgrounds…"
              className="min-h-[48px] flex-1 resize-none rounded-[14px] border border-white/[0.08] bg-wf-bg/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/25"
              aria-label="Message to AI"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading}
              className="shrink-0 self-end rounded-[14px] bg-gradient-to-br from-blue-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
