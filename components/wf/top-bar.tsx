"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOptionalAuthAntiAbuse } from "@/components/wf/auth-anti-abuse-context";
import { useTutorialTour } from "@/components/wf/tutorial-tour-context";
import { googleLyricsSearchUrl } from "@/lib/google-lyrics-search";

export function TopBar() {
  const router = useRouter();
  const { startTour } = useTutorialTour();
  const anti = useOptionalAuthAntiAbuse();
  const [q, setQ] = useState("");
  const showConcurrentIp =
    Boolean(anti?.concurrentIpWarning && !anti.dismissedConcurrentIp);

  return (
    <header className="relative sticky top-0 z-30 flex shrink-0 flex-col border-b border-wf-border bg-wf-bg/80 backdrop-blur-xl">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-px opacity-75 wf-brand-hairline"
        aria-hidden
      />
      <div className="relative z-[2] flex h-14 w-full items-center gap-4 px-6">
      <div
        className="relative z-[2] min-w-0 max-w-xl flex-1"
        data-wf-tour="tour-topbar-search"
      >
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-wf-muted"
          aria-hidden
        >
          🔍
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) {
              e.preventDefault();
              window.open(googleLyricsSearchUrl(q.trim()), "_blank", "noopener,noreferrer");
            }
          }}
          placeholder="Type a song, then Enter — opens Google with “… lyrics”"
          className="h-10 w-full rounded-[12px] border border-wf-input-border bg-wf-card/80 py-2 pl-10 pr-24 text-sm text-wf-text placeholder:text-wf-muted/80 outline-none transition focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20"
          aria-label="Search box — Enter opens Google lyrics search"
        />
        <a
          href={q.trim() ? googleLyricsSearchUrl(q.trim()) : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/[0.1] bg-wf-bg/90 px-2.5 py-1 text-[10px] font-semibold transition hover:border-violet-500/40 hover:bg-violet-500/10 ${
            q.trim() ? "text-violet-200/95" : "pointer-events-none text-wf-muted/50"
          }`}
          title={q.trim() ? `Google: ${q.trim()} lyrics` : "Type a song name first"}
          aria-label="Open Google lyrics search"
          aria-disabled={!q.trim()}
          onClick={(e) => {
            if (!q.trim()) e.preventDefault();
          }}
        >
          Google lyrics
        </a>
      </div>

      <div className="relative z-[2] ml-auto flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            startTour();
            router.push("/dashboard");
          }}
          className="wf-spotlight-tour-btn inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-violet-500/35 bg-violet-500/10 px-3 text-xs font-semibold text-violet-200/95 transition hover:border-violet-400/50 hover:bg-violet-500/15"
          title="Start spotlight tour — highlights each control"
        >
          <span aria-hidden>✨</span> Spotlight tour
        </button>
        <Link
          href="/present?room=default"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-gradient-to-r from-blue-600/90 via-violet-600/90 to-fuchsia-600/80 px-3 text-xs font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110"
        >
          <span aria-hidden>🎯</span> Present
        </Link>
      </div>
      </div>

      {showConcurrentIp ? (
        <div
          className="relative z-[2] border-t border-amber-500/25 bg-amber-500/[0.08] px-4 py-2 text-center"
          role="status"
        >
          <p className="text-[11px] leading-snug text-amber-100/90">
            This account was active from more than one network recently. If that wasn&apos;t you, change
            your password in settings.{" "}
            <button
              type="button"
              onClick={() => anti?.dismissConcurrentIpWarning()}
              className="font-semibold text-amber-200 underline decoration-amber-400/50 underline-offset-2 hover:text-white"
            >
              Dismiss
            </button>
          </p>
        </div>
      ) : null}
    </header>
  );
}
