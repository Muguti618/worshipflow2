"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FreeSetlistLimitBanner } from "@/components/wf/free-setlist-limit-banner";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { useActiveDeck } from "@/hooks/use-active-deck";
import { useAllSetlists } from "@/hooks/use-all-setlists";
import {
  broadcastDeckUpdated,
  broadcastSlideReset,
  EMPTY_PRESENTER_PLACEHOLDER,
  postPresenterSlide,
  readActiveSetlistId,
  writeActiveDeck,
} from "@/lib/active-deck";
import { presentRoomKeyForSetlist } from "@/lib/present-room-key";
import { kindLabel } from "@/lib/setlists-catalog";
import { getDashboardGreeting } from "@/lib/dashboard-greeting";
import { flattenSetlistToDeck, itemRangesInDeck } from "@/lib/setlist-flatten";
import { FREE_MAX_SETLISTS, FREE_TIER_SLIDE_BRANDING } from "@/lib/plan-limits";
import { getSetlistById } from "@/lib/setlists-resolve";
import { RemoteControlQr } from "@/components/wf/remote-control-qr";
import { SlideTransitionShell } from "@/components/wf/slide-transition-shell";
import { SlideStage } from "@/components/wf/slide-stage";
import { useSlideTransition } from "@/hooks/use-slide-transition";
import { useAuthSession } from "@/hooks/use-auth-session";

const PREVIEW_FALLBACK_BG =
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80";

type StageBackground = {
  backgroundUrl?: string;
  backgroundColor?: string;
  backgroundFullBleed?: boolean;
};

function splitTrailingEmoji(s: string): { text: string; emoji: string | null } {
  const t = s.trim();
  if (!t) return { text: "", emoji: null };
  // Matches a final emoji (incl. variation selectors/ZWJ sequences) optionally preceded by whitespace.
  const m = t.match(/\s*([\p{Extended_Pictographic}\uFE0F\u200D]+)\s*$/u);
  if (!m) return { text: t, emoji: null };
  const emoji = m[1] ?? null;
  const text = t.slice(0, t.length - m[0].length).trimEnd();
  return { text, emoji };
}

export function DashboardHome() {
  const { limitsApply, ready: planReady } = usePlanEntitlements();
  const { session } = useAuthSession();
  const deck = useActiveDeck();
  const { setlists: allSetlists, version: listVersion } = useAllSetlists();
  const setlistLimitBannerRef = useRef<HTMLDivElement>(null);
  const atFreeSetlistLimit = planReady && limitsApply && allSetlists.length >= FREE_MAX_SETLISTS;
  const [previewIdx, setPreviewIdx] = useState(0);
  const [activeListId, setActiveListId] = useState("");
  const [transition] = useSlideTransition();
  const [greeting, setGreeting] = useState(() => getDashboardGreeting());

  useEffect(() => {
    const tick = () =>
      setGreeting(getDashboardGreeting(new Date(), { displayName: session?.name }));
    tick();
    const id = setInterval(tick, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [session?.name]);

  useEffect(() => {
    const saved = readActiveSetlistId();
    if (saved && getSetlistById(saved)) {
      setActiveListId(saved);
      return;
    }
    if (allSetlists.length > 0) {
      const first = allSetlists[0]!;
      writeActiveDeck(flattenSetlistToDeck(first.items), first.id);
      broadcastDeckUpdated();
      setActiveListId(first.id);
      return;
    }
    setActiveListId("");
    writeActiveDeck(EMPTY_PRESENTER_PLACEHOLDER, "");
    broadcastDeckUpdated();
  }, [listVersion, allSetlists]);

  useEffect(() => {
    setPreviewIdx((p) => Math.min(p, Math.max(0, deck.length - 1)));
  }, [deck.length]);

  const activeSetlist = useMemo(
    () => getSetlistById(activeListId),
    [activeListId, listVersion],
  );

  const presentRoom = useMemo(() => presentRoomKeyForSetlist(activeListId), [activeListId]);

  const setlistRanges = useMemo(
    () => (activeSetlist ? itemRangesInDeck(activeSetlist.items) : []),
    [activeSetlist],
  );

  const selectSetlist = useCallback((id: string) => {
    if (!id) return;
    const def = getSetlistById(id);
    if (!def) return;
    writeActiveDeck(flattenSetlistToDeck(def.items), id);
    broadcastDeckUpdated();
    const room = presentRoomKeyForSetlist(id);
    broadcastSlideReset(room);
    void postPresenterSlide(room, 0);
    setActiveListId(id);
    setPreviewIdx(0);
  }, []);

  const slide = deck[previewIdx] ?? deck[0]!;
  const preview = slide;

  const stageBackground = useMemo((): StageBackground => {
    const s = deck[previewIdx] ?? deck[0];
    if (!s) return {};
    if (s.backgroundColor?.trim()) {
      return { backgroundColor: s.backgroundColor.trim() };
    }
    if (s.backgroundUrl?.trim()) {
      return {
        backgroundUrl: s.backgroundUrl.trim(),
        ...(s.backgroundFullBleed ? { backgroundFullBleed: true as const } : {}),
      };
    }
    return {};
  }, [deck, previewIdx]);

  const previewBgUrl =
    stageBackground.backgroundUrl ??
    (!stageBackground.backgroundColor?.trim() ? PREVIEW_FALLBACK_BG : undefined);

  const presentHref = `/present?room=${encodeURIComponent(presentRoom)}`;
  const audienceHref = `/present/audience?room=${encodeURIComponent(presentRoom)}`;
  const controlHref = `/present/control?room=${encodeURIComponent(presentRoom)}`;

  const previewSongContext = useMemo(() => {
    for (const { item, startIndex, count } of setlistRanges) {
      if (previewIdx >= startIndex && previewIdx < startIndex + count) {
        const within = previewIdx - startIndex + 1;
        return { item, within, count };
      }
    }
    return null;
  }, [setlistRanges, previewIdx]);

  const titleParts = useMemo(() => splitTrailingEmoji(greeting.title), [greeting.title]);
  const showPreviewSongContext =
    Boolean(previewSongContext) && (slide.layout ?? "") !== "song-title";

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {atFreeSetlistLimit ? <FreeSetlistLimitBanner ref={setlistLimitBannerRef} /> : null}
      <header className="shrink-0 border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-4 sm:gap-6">
          <div className="min-w-0 max-w-[min(100%,40rem)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-wf-muted/75">
              Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-[1.15] tracking-tight sm:text-3xl md:text-[2.125rem]">
              <span className="bg-gradient-to-r from-slate-200 via-slate-300 to-slate-500 bg-clip-text text-transparent">
                {titleParts.text || greeting.title}
              </span>
              {titleParts.emoji ? (
                <span className="ml-2 text-wf-text" aria-hidden>
                  {titleParts.emoji}
                </span>
              ) : null}
            </h1>
            <p className="mt-2.5 max-w-xl text-sm font-normal leading-relaxed text-wf-muted">
              {greeting.subtitle}{" "}
              <Link
                href="/tutorial"
                className="font-medium text-sky-400/90 hover:text-sky-300 hover:underline"
              >
                Tutorial
              </Link>
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:min-w-[min(100%,16rem)] sm:max-w-[20rem]">
            <label
              htmlFor="wf-dash-setlist"
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-wf-muted/90"
            >
              Presenter setlist
            </label>
            {allSetlists.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/[0.12] bg-wf-card/40 px-3 py-2.5 text-xs leading-snug text-wf-muted">
                No setlists yet — use <strong className="font-medium text-wf-text/85">+ New</strong> to create one.
              </p>
            ) : (
              <select
                id="wf-dash-setlist"
                data-wf-tour="tour-dash-setlist"
                value={activeListId || ""}
                onChange={(e) => selectSetlist(e.target.value)}
                className="h-11 w-full cursor-pointer rounded-xl border border-white/[0.12] bg-wf-card/80 px-3.5 py-2 text-sm font-medium text-wf-text shadow-sm shadow-black/20 outline-none ring-0 transition hover:border-white/20 focus:border-sky-500/45 focus:ring-2 focus:ring-sky-500/25"
                aria-label="Choose setlist for presenter"
              >
                {allSetlists.map((s) => (
                  <option key={s.id} value={s.id} className="bg-zinc-900 text-wf-text">
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center sm:gap-3">
            <Link
              href="/setlists/new"
              data-wf-tour="tour-dash-new-setlist"
              onClick={(e) => {
                if (atFreeSetlistLimit) {
                  e.preventDefault();
                  setlistLimitBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              title={atFreeSetlistLimit ? "Setlist limit — upgrade for more" : "New setlist"}
              className={`inline-flex h-9 shrink-0 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition sm:h-8 ${
                atFreeSetlistLimit
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-100/90 hover:bg-amber-500/15"
                  : "border-dashed border-white/[0.12] text-wf-muted hover:border-white/18 hover:text-wf-text"
              }`}
            >
              + New
            </Link>
            <Link
              href={presentHref}
              data-wf-tour="tour-dash-present"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 min-w-[44px] flex-1 items-center justify-center gap-2 rounded-[12px] bg-blue-600 px-3 text-sm font-semibold text-white shadow-lg shadow-black/30 hover:bg-blue-500 sm:flex-initial sm:px-4"
            >
              <span className="sm:hidden">Presenter</span>
              <span className="hidden sm:inline">Open Presenter</span>
            </Link>
            <Link
              href={audienceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 min-w-[44px] flex-1 items-center justify-center gap-2 rounded-[12px] border border-white/[0.12] bg-wf-card/60 px-3 text-sm font-semibold text-wf-text hover:border-white/18 sm:flex-initial sm:px-4"
            >
              Audience
            </Link>
            <Link
              href="/setlists"
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[12px] border border-white/[0.08] px-3 text-sm font-medium text-wf-muted hover:text-wf-text sm:w-auto sm:px-4"
            >
              Edit setlists
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-6 p-4 sm:gap-8 sm:p-6 lg:flex-row lg:items-stretch lg:gap-8">
        <aside className="order-2 flex w-full shrink-0 flex-col gap-4 lg:order-1 lg:w-[220px] lg:max-w-[220px]">
          {limitsApply ? (
            <div className="rounded-[14px] border border-amber-500/25 bg-amber-500/[0.08] p-3 backdrop-blur-xl">
              <p className="text-xs font-medium text-amber-100/90">Phone / tablet remote</p>
              <p className="mt-1 text-[11px] leading-snug text-amber-100/75">
                Not included on Free. Pro unlocks the room pilot from another device.
              </p>
              <Link
                href="/upgrade"
                className="mt-3 flex w-full items-center justify-center rounded-lg bg-amber-400/90 py-2 text-xs font-bold text-amber-950 transition hover:bg-amber-300"
              >
                View Pro plans
              </Link>
            </div>
          ) : (
            <div className="rounded-[14px] border border-white/[0.08] bg-wf-card/50 p-3 backdrop-blur-xl">
              <p className="text-xs font-medium text-wf-muted">Phone / tablet remote</p>
              <p className="mt-1 text-[11px] leading-snug text-wf-muted">
                Scan to open the controller for room{" "}
                <span className="font-mono text-wf-text/90">{presentRoom}</span>. Use the same
                worshipflow2 site and sign in as this account — phone can be on Wi‑Fi or cellular;
                both devices need internet (not the same network).
              </p>
              <div className="mt-3 flex justify-center">
                <RemoteControlQr room={presentRoom} size={160} />
              </div>
              <Link
                href={controlHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center rounded-lg border border-white/[0.1] py-2 text-xs font-medium text-wf-text transition hover:border-emerald-500/35 hover:text-emerald-200/90"
              >
                Open remote in browser →
              </Link>
            </div>
          )}
        </aside>

        <main className="order-1 flex min-h-0 min-w-0 flex-1 flex-col lg:order-2 lg:min-w-0 lg:flex-[1.12]">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.05] pb-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                  <span className="wf-live-dot absolute inset-0 rounded-full bg-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-wf-muted/85">
                  Stage preview
                </p>
              </div>
              <p className="text-xs text-wf-muted/70">
                Deck position · slide {previewIdx + 1} of {deck.length}
              </p>
              {showPreviewSongContext && previewSongContext ? (
                <p className="text-[11px] text-wf-muted/75">
                  <span className="font-medium text-wf-text/85">
                    {previewSongContext.item.name}
                  </span>
                  <span className="text-wf-muted/50">
                    {" "}
                    · {previewSongContext.within}/{previewSongContext.count} in this item
                  </span>
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewIdx((p) => Math.max(0, p - 1))}
                className="rounded-[10px] border border-white/[0.12] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-wf-text transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() =>
                  setPreviewIdx((p) => Math.min(deck.length - 1, p + 1))
                }
                className="rounded-[10px] border border-white/[0.12] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-wf-text transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                Next →
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              className="pointer-events-none absolute left-1/2 top-[6%] z-0 h-[min(48%,400px)] w-[min(98%,960px)] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-sky-500/[0.12] via-slate-500/8 to-transparent blur-3xl"
              aria-hidden
            />
            <div className="relative z-[1] flex min-h-0 flex-1 flex-col rounded-[22px] border border-white/[0.1] bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent p-[5px] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_120px_-36px_rgba(99,102,241,0.42),0_16px_56px_-28px_rgba(167,139,250,0.2)]">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[17px] bg-wf-bg/30 ring-1 ring-inset ring-white/[0.06]">
                <SlideTransitionShell
                  transition={transition}
                  transitionKey={`deck-${previewIdx}`}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <SlideStage
                    variant="preview"
                    className="min-h-[min(74vh,920px)] w-full flex-1 rounded-none ring-0 lg:min-h-[min(62vh,820px)]"
                    title={preview.title}
                    lines={preview.lines}
                    layout={slide.layout}
                    backgroundUrl={previewBgUrl}
                    backgroundColor={stageBackground.backgroundColor}
                    backgroundFullBleed={stageBackground.backgroundFullBleed}
                    motion={
                      !stageBackground.backgroundColor?.trim() &&
                      !stageBackground.backgroundFullBleed
                    }
                    typography={slide.typography ?? "editorial"}
                    tierWatermark={
                      planReady && limitsApply ? FREE_TIER_SLIDE_BRANDING : undefined
                    }
                  />
                </SlideTransitionShell>
              </div>
            </div>
          </div>
        </main>

        <aside className="order-3 flex w-full shrink-0 flex-col gap-3 lg:w-[min(280px,32vw)] lg:max-w-[280px]">
          <div className="max-h-[min(52vh,520px)] overflow-y-auto rounded-[14px] border border-white/[0.08] bg-wf-card/50 p-3 backdrop-blur-xl">
            <p className="text-[10px] font-medium uppercase tracking-wider text-wf-muted">
              In this setlist
            </p>
            {activeSetlist ? (
              <>
                <p className="mt-1 text-sm font-semibold leading-tight text-wf-text">
                  {activeSetlist.name}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-wf-muted">
                  {activeSetlist.description}
                </p>
                <ul className="mt-3 space-y-3 border-t border-white/[0.06] pt-3">
                  {setlistRanges.map(({ item, startIndex, count }) => (
                    <li key={item.id}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <span className="text-xs font-semibold text-wf-text">{item.name}</span>
                        <span className="text-[10px] tabular-nums text-wf-muted/90">
                          {kindLabel(item.kind)} · {count} slide{count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <ul className="mt-1.5 space-y-0.5 border-l border-sky-500/15 pl-2.5">
                        {item.slides.map((sl, j) => {
                          const globalIdx = startIndex + j;
                          const isHere = previewIdx === globalIdx;
                          return (
                            <li key={`${item.id}-${j}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewIdx(globalIdx);
                                }}
                                className={`w-full rounded-md px-1 py-1 text-left text-[11px] leading-snug transition ${
                                  isHere
                                    ? "bg-sky-500/12 font-medium text-sky-200"
                                    : "text-wf-muted hover:bg-white/[0.04] hover:text-wf-text"
                                }`}
                              >
                                {sl.title}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-[11px] text-wf-muted">Choose a setlist in the dropdown above.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
