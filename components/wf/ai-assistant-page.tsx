"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";

type Msg = { role: "user" | "assistant"; text: string; tag?: string };

type ConnectionKind = "live" | "setup";

const TAG_CHIPS: Record<string, string> = {
  bible: "Scripture",
  slides: "Slides & layout",
  visual: "Backgrounds",
  setlist: "Setlists",
  present: "Presenting",
  song: "New songs",
  general: "Ideas",
};

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

const SEED: Msg[] = [
  {
    role: "assistant",
    text: "Ask anything about slides, setlists, presenting, backgrounds, or planning. I’ll keep it concise and practical.",
  },
];

const TRY_PROMPTS = [
  "How do multiple slides work per song?",
  "Suggest a verse about hope",
  "Help me with backgrounds for slides",
  "How do setlists connect to Present?",
];

function chipLabel(tag?: string): string | null {
  if (!tag || tag === "error" || tag === "assistant" || tag === "openai") return null;
  return TAG_CHIPS[tag] ?? null;
}

export function AiAssistantPage() {
  const { limitsApply, ready: planReady } = usePlanEntitlements();
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<ConnectionKind>("setup");

  useEffect(() => {
    void fetch("/api/ai/status")
      .then((r) => r.json())
      .then(
        (j: { openaiConfigured?: boolean; dummyFallbackAllowed?: boolean }) => {
          if (j.openaiConfigured) setConnection("live");
          else setConnection("setup");
        },
      )
      .catch(() => setConnection("setup"));
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
        error?: string;
        details?: string;
      };
      if (!r.ok) {
        let err =
          typeof j.error === "string" && j.error.trim()
            ? j.error.trim()
            : r.status === 503
              ? "Smart replies aren’t available on this server right now. You can still use the rest of the app — try the Tutorial from the sidebar."
              : "Something went wrong. Please try again in a moment.";
        if (process.env.NODE_ENV === "development" && typeof j.details === "string" && j.details.trim()) {
          err = `${err}\n\nDetails (dev only):\n${j.details.trim().slice(0, 800)}`;
        }
        setMessages((m) => [...m, { role: "assistant", text: err, tag: "error" }]);
        return;
      }
      if (typeof j.text === "string" && j.text.length > 0) {
        const reply = j.text;
        const tag = typeof j.tag === "string" ? j.tag : undefined;
        setMessages((m) => [...m, { role: "assistant", text: reply, tag }]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: j.error ?? "Something went wrong. Try again with a shorter question.",
            tag: "error",
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "We couldn’t reach the server. Check your connection and try again.",
          tag: "error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [draft, loading, messages]);

  if (planReady && limitsApply) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10 lg:px-8">
        <div className="rounded-[22px] border border-white/[0.08] bg-gradient-to-b from-slate-500/[0.06] to-transparent p-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">
            Pro feature
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-wf-text">Assistant chat</h1>
          <p className="mt-4 text-sm leading-relaxed text-wf-muted">
            Ask questions about slides, setlists, presenting, and scripture ideas — included with Pro.
          </p>
          <Link
            href="/upgrade"
            className="mt-8 inline-flex h-12 w-full max-w-xs items-center justify-center rounded-[14px] bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:brightness-110"
          >
            View plans
          </Link>
          <Link
            href="/dashboard"
            className="mt-4 block text-sm text-sky-400/90 hover:text-sky-200 hover:underline"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusBanner =
    connection === "live" ? (
      <div className="flex items-center gap-3 rounded-[14px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
        <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
        <div>
          <p className="text-sm font-medium text-emerald-100/95">Full smart replies</p>
          <p className="text-[11px] text-emerald-200/70">You’ll get detailed, conversational answers.</p>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-3 rounded-[14px] border border-white/[0.08] bg-wf-bg/50 px-4 py-3">
        <span className="flex h-2 w-2 shrink-0 rounded-full bg-white/35" />
        <div>
          <p className="text-sm font-medium text-wf-text">Smart replies not configured</p>
          <p className="text-[11px] text-wf-muted">
            Chat may not work until the server is set up. Open{" "}
            <Link href="/settings" className="text-sky-400 hover:underline">
              Settings
            </Link>{" "}
            for hosting notes, or try the{" "}
            <Link href="/tutorial" className="text-sky-400 hover:underline">
              Tutorial
            </Link>
            .
          </p>
        </div>
      </div>
    );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-5 py-8 lg:px-8">
      <header className="mb-6 shrink-0 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-wf-text">Assistant</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-wf-muted">
            Quick answers about <strong className="font-medium text-wf-text/90">slides</strong>,{" "}
            <strong className="font-medium text-wf-text/90">setlists</strong>,{" "}
            <strong className="font-medium text-wf-text/90">scripture</strong>, and{" "}
            <strong className="font-medium text-wf-text/90">presenting</strong>. Use the suggestions below or
            type your own question.
          </p>
        </div>
        {statusBanner}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-white/[0.08] bg-wf-card/35 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 lg:p-6">
          {messages.map((msg, i) => {
            const chip = chipLabel(msg.tag);
            return (
              <div
                key={`${i}-${msg.text.slice(0, 12)}`}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[min(100%,520px)] rounded-[18px] px-4 py-3.5 ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600/30 to-slate-600/20 text-wf-text ring-1 ring-inset ring-white/[0.06]"
                      : msg.tag === "error"
                        ? "border border-red-500/25 bg-red-500/10 text-red-100/95"
                        : "border border-white/[0.06] bg-wf-bg/45 text-wf-muted"
                  }`}
                >
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {msg.role === "user" ? "You" : "Assistant"}
                  </p>
                  {chip ? (
                    <span className="mb-2 inline-flex rounded-full bg-sky-500/12 px-2.5 py-0.5 text-[10px] font-semibold text-sky-200/90">
                      {chip}
                    </span>
                  ) : null}
                  <div className="text-sm leading-relaxed whitespace-pre-line">{formatAiText(msg.text)}</div>
                </div>
              </div>
            );
          })}
          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-[18px] border border-white/[0.06] bg-wf-bg/45 px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Assistant</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-wf-muted">
                  <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                  Thinking…
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-white/[0.06] bg-wf-bg/20 p-4 lg:p-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-wf-muted/90">
            Try asking
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {TRY_PROMPTS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setDraft(ex)}
                className="rounded-full border border-white/[0.1] bg-wf-card/50 px-3.5 py-1.5 text-left text-xs text-wf-text/90 transition hover:border-white/15 hover:bg-white/[0.05]"
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={3}
              placeholder="Type your question… (Shift+Enter for a new line)"
              className="min-h-[88px] flex-1 resize-y rounded-[16px] border border-white/[0.1] bg-wf-bg/55 px-4 py-3 text-sm text-wf-text placeholder:text-wf-muted/60 outline-none transition focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/20"
              aria-label="Message to assistant"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !draft.trim()}
              className="h-11 shrink-0 rounded-[14px] bg-gradient-to-br from-blue-600 to-blue-700 px-6 text-sm font-semibold text-white shadow-lg shadow-black/35 transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-40 sm:h-[88px] sm:px-8"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
