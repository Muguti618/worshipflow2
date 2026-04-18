"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOptionalAuthAntiAbuse } from "@/components/wf/auth-anti-abuse-context";
import { useTutorialTour } from "@/components/wf/tutorial-tour-context";
import { googleLyricsSearchUrl } from "@/lib/google-lyrics-search";
import { presentRoomKeyFromActiveSetlist } from "@/lib/present-room-key";

type TopBarProps = {
  onMenuClick?: () => void;
};

export function TopBar({ onMenuClick }: TopBarProps) {
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
      <div className="relative z-[2] flex w-full flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:h-14 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-0">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-white/[0.12] bg-wf-card/70 text-lg text-wf-text transition hover:border-white/20 hover:bg-white/[0.05] md:hidden"
            aria-label="Open navigation menu"
          >
            <span aria-hidden>☰</span>
          </button>
        ) : null}

        <div
          className="relative z-[2] min-w-0 flex-1 basis-[min(100%,14rem)] sm:max-w-xl"
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
            placeholder="Song name, Enter → Google lyrics"
            className="h-10 w-full rounded-[12px] border border-wf-input-border bg-wf-card/80 py-2 pl-10 pr-[4.5rem] text-sm text-wf-text placeholder:text-wf-muted/80 outline-none transition focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/20 sm:pr-28"
            aria-label="Search box — Enter opens Google lyrics search"
          />
          <a
            href={q.trim() ? googleLyricsSearchUrl(q.trim()) : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`absolute right-1.5 top-1/2 max-w-[5.5rem] -translate-y-1/2 truncate rounded-lg border border-white/[0.1] bg-wf-bg/90 px-2 py-1 text-center text-[10px] font-semibold transition hover:border-white/20 hover:bg-white/[0.05] sm:max-w-none sm:px-2.5 ${
              q.trim() ? "text-slate-200/95" : "pointer-events-none text-wf-muted/50"
            }`}
            title={q.trim() ? `Google: ${q.trim()} lyrics` : "Type a song name first"}
            aria-label="Open Google lyrics search"
            aria-disabled={!q.trim()}
            onClick={(e) => {
              if (!q.trim()) e.preventDefault();
            }}
          >
            <span className="sm:hidden">Google</span>
            <span className="hidden sm:inline">Google lyrics</span>
          </a>
        </div>

        <div className="relative z-[2] ml-auto flex basis-full flex-wrap items-center justify-end gap-2 sm:basis-auto sm:shrink-0">
          <button
            type="button"
            onClick={() => {
              startTour();
              router.push("/dashboard");
            }}
            className="wf-spotlight-tour-btn inline-flex h-9 min-w-0 items-center gap-1.5 rounded-[10px] border border-white/15 bg-white/[0.04] px-2.5 text-xs font-semibold text-slate-200/95 transition hover:border-sky-400/45 hover:bg-sky-500/10 sm:px-3"
            title="Start spotlight tour — highlights each control"
            aria-label="Spotlight tour"
          >
            <span aria-hidden>✨</span>
            <span className="sm:hidden">Tour</span>
            <span className="hidden sm:inline">Spotlight tour</span>
          </button>
          <Link
            href={`/present?room=${encodeURIComponent(presentRoomKeyFromActiveSetlist())}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] bg-blue-600 px-2.5 text-xs font-semibold text-white shadow-lg shadow-black/35 transition hover:bg-blue-500 sm:px-3"
          >
            <span aria-hidden>🎯</span>
            Present
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
