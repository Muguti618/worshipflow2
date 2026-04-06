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
  DEFAULT_PRESENT_ROOM,
  EMPTY_PRESENTER_PLACEHOLDER,
  postPresenterSlide,
  readActiveSetlistId,
  writeActiveDeck,
} from "@/lib/active-deck";
import { lookupScripture } from "@/lib/bible-lookup";
import { scriptureToSlideCards } from "@/lib/slide-engine";
import { kindLabel } from "@/lib/setlists-catalog";
import { getDashboardGreeting } from "@/lib/dashboard-greeting";
import { flattenSetlistToDeck, itemRangesInDeck } from "@/lib/setlist-flatten";
import { FREE_MAX_SETLISTS, FREE_TRANSITION_IDS } from "@/lib/plan-limits";
import {
  SLIDE_TRANSITION_OPTIONS,
  type SlideTransitionId,
} from "@/lib/slide-transition";
import { getSetlistById } from "@/lib/setlists-resolve";
import { RemoteControlQr } from "@/components/wf/remote-control-qr";
import { SlideTransitionShell } from "@/components/wf/slide-transition-shell";
import { SlideStage } from "@/components/wf/slide-stage";
import { useSlideTransition } from "@/hooks/use-slide-transition";

export function DashboardHome() {
  const { limitsApply, ready: planReady } = usePlanEntitlements();
  const deck = useActiveDeck();
  const { setlists: allSetlists, version: listVersion } = useAllSetlists();
  const setlistLimitBannerRef = useRef<HTMLDivElement>(null);
  const atFreeSetlistLimit = planReady && limitsApply && allSetlists.length >= FREE_MAX_SETLISTS;
  const [previewIdx, setPreviewIdx] = useState(0);
  const [activeListId, setActiveListId] = useState("");
  const [bgMode, setBgMode] = useState<"ai" | "stock">("ai");
  const [transition, setTransition] = useSlideTransition();
  const [autoFormat, setAutoFormat] = useState(true);
  const [bibleInput, setBibleInput] = useState("John 3:16");
  const [verseOverride, setVerseOverride] = useState<{
    title?: string;
    lines: string[];
  } | null>(null);
  const [greeting, setGreeting] = useState(() => getDashboardGreeting());

  useEffect(() => {
    const tick = () => setGreeting(getDashboardGreeting());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

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
    broadcastSlideReset(DEFAULT_PRESENT_ROOM);
    void postPresenterSlide(DEFAULT_PRESENT_ROOM, 0);
    setActiveListId(id);
    setPreviewIdx(0);
    setVerseOverride(null);
  }, []);

  const slide = deck[previewIdx] ?? deck[0]!;
  const preview = verseOverride ?? slide;

  const bgUrl = useMemo(() => {
    if (bgMode === "stock") {
      return "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&q=80";
    }
    return "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80";
  }, [bgMode]);

  const stageBackground = useMemo(() => {
    if (verseOverride) return {} as { backgroundUrl?: string; backgroundColor?: string; backgroundFullBleed?: boolean };
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
  }, [verseOverride, deck, previewIdx]);

  const previewBgUrl = verseOverride
    ? bgUrl
    : stageBackground.backgroundUrl ??
      (!stageBackground.backgroundColor?.trim() ? bgUrl : undefined);

  const applyBibleToPreview = useCallback(() => {
    const r = lookupScripture(bibleInput, "NIV");
    if (!r) {
      window.alert(
        "That reference is not in our built-in sample set. Try John 3:16, Romans 8:28, Psalm 23, or use the Bible page for AI verse ideas.",
      );
      return;
    }
    const cards = scriptureToSlideCards(r.ref, r.text);
    const first = cards[0];
    setVerseOverride({
      title: first?.title ?? r.ref,
      lines: first?.lines ?? [r.text],
    });
  }, [bibleInput]);

  const presentHref = `/present?room=${encodeURIComponent(DEFAULT_PRESENT_ROOM)}`;
  const audienceHref = `/present/audience?room=${encodeURIComponent(DEFAULT_PRESENT_ROOM)}`;
  const controlHref = `/present/control?room=${encodeURIComponent(DEFAULT_PRESENT_ROOM)}`;

  const transitionOptions = useMemo(
    () =>
      limitsApply
        ? SLIDE_TRANSITION_OPTIONS.filter((o) => FREE_TRANSITION_IDS.includes(o.id))
        : SLIDE_TRANSITION_OPTIONS,
    [limitsApply],
  );

  const previewSongContext = useMemo(() => {
    if (verseOverride) return null;
    for (const { item, startIndex, count } of setlistRanges) {
      if (previewIdx >= startIndex && previewIdx < startIndex + count) {
        const within = previewIdx - startIndex + 1;
        return { item, within, count };
      }
    }
    return null;
  }, [setlistRanges, previewIdx, verseOverride]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {atFreeSetlistLimit ? <FreeSetlistLimitBanner ref={setlistLimitBannerRef} /> : null}
      <header className="shrink-0 border-b border-white/[0.06] px-6 py-5">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-[min(100%,40rem)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-wf-muted/75">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-[1.15] tracking-tight md:text-[2.125rem]">
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                {greeting.title}
              </span>
            </h1>
            <p className="mt-2.5 max-w-xl text-sm font-normal leading-relaxed text-wf-muted">
              {greeting.subtitle}
            </p>
            <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-wf-muted/65">
              {greeting.detailLine}{" "}
              <Link
                href="/tutorial"
                className="font-medium text-violet-400/90 hover:text-violet-300 hover:underline"
              >
                Tutorial
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label htmlFor="wf-dash-setlist" className="sr-only">
              Setlist for presenter
            </label>
            <select
              id="wf-dash-setlist"
              data-wf-tour="tour-dash-setlist"
              value={activeListId || ""}
              onChange={(e) => selectSetlist(e.target.value)}
              disabled={allSetlists.length === 0}
              className="h-8 max-w-[13rem] shrink-0 cursor-pointer rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 text-xs text-wf-text/90 outline-none transition hover:border-white/12 focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {allSetlists.length === 0 ? (
                <option value="">No setlists yet</option>
              ) : (
                allSetlists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
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
              className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-medium transition ${
                atFreeSetlistLimit
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-100/90 hover:bg-amber-500/15"
                  : "border-dashed border-white/[0.12] text-wf-muted hover:border-violet-500/35 hover:text-wf-text"
              }`}
            >
              + New
            </Link>
            <Link
              href={presentHref}
              data-wf-tour="tour-dash-present"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-gradient-to-r from-blue-600/90 to-violet-600/90 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-900/25"
            >
              Open Presenter
            </Link>
            <Link
              href={audienceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/[0.12] bg-wf-card/60 px-4 text-sm font-semibold text-wf-text hover:border-violet-500/35"
            >
              Audience
            </Link>
            <Link
              href="/setlists"
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/[0.08] px-4 text-sm font-medium text-wf-muted hover:text-wf-text"
            >
              Edit setlists
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-8 p-6 lg:flex-row lg:items-stretch lg:gap-8">
        <aside className="order-2 flex w-full shrink-0 flex-col gap-4 lg:order-1 lg:w-[220px] lg:max-w-[220px]">
          <div className="rounded-[14px] border border-white/[0.08] bg-wf-card/50 p-3 backdrop-blur-xl">
            <p className="text-xs font-medium text-wf-muted">Bible · preview only</p>
            <label htmlFor="wf-dash-bible" className="sr-only">
              Bible search
            </label>
            <input
              id="wf-dash-bible"
              data-wf-tour="tour-dash-bible"
              value={bibleInput}
              onChange={(e) => setBibleInput(e.target.value)}
              placeholder="John 3:16, armor of God…"
              className="mt-2 h-9 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-2.5 text-xs text-wf-text outline-none focus:ring-1 focus:ring-violet-500/25"
            />
            <button
              type="button"
              onClick={applyBibleToPreview}
              className="mt-2 w-full rounded-lg bg-gradient-to-r from-blue-600/90 to-violet-600/90 py-2 text-xs font-semibold text-white"
            >
              Show on preview
            </button>
            {verseOverride ? (
              <button
                type="button"
                onClick={() => setVerseOverride(null)}
                className="mt-1.5 w-full rounded-lg border border-white/[0.1] py-1.5 text-[11px] font-medium text-wf-muted hover:text-wf-text"
              >
                Clear verse preview
              </button>
            ) : null}
            <Link
              href="/bible"
              className="mt-2 flex w-full items-center justify-center rounded-lg border border-white/[0.1] py-2 text-xs font-medium text-wf-text transition hover:border-violet-500/35"
            >
              Full Bible tool →
            </Link>
          </div>

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
                Scan with your camera to open the controller for room{" "}
                <span className="font-mono text-wf-text/90">{DEFAULT_PRESENT_ROOM}</span> on this Wi‑Fi
                (same address as this browser).
              </p>
              <div className="mt-3 flex justify-center">
                <RemoteControlQr room={DEFAULT_PRESENT_ROOM} size={160} />
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
                  {verseOverride ? "Verse preview" : "Stage preview"}
                </p>
              </div>
              <p className="text-xs text-wf-muted/70">
                {verseOverride
                  ? "Local only — not sent to Presenter"
                  : `Deck position · slide ${previewIdx + 1} of ${deck.length}`}
              </p>
              {previewSongContext ? (
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
            {!verseOverride ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewIdx((p) => Math.max(0, p - 1))}
                  className="rounded-[10px] border border-white/[0.12] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-wf-text transition hover:border-violet-500/25 hover:bg-white/[0.06]"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewIdx((p) => Math.min(deck.length - 1, p + 1))
                  }
                  className="rounded-[10px] border border-white/[0.12] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-wf-text transition hover:border-violet-500/25 hover:bg-white/[0.06]"
                >
                  Next →
                </button>
              </div>
            ) : null}
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              className="pointer-events-none absolute left-1/2 top-[6%] z-0 h-[min(48%,400px)] w-[min(98%,960px)] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-violet-500/[0.22] via-fuchsia-500/10 to-transparent blur-3xl"
              aria-hidden
            />
            <div className="relative z-[1] flex min-h-0 flex-1 flex-col rounded-[22px] border border-white/[0.1] bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent p-[5px] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_120px_-36px_rgba(99,102,241,0.42),0_16px_56px_-28px_rgba(167,139,250,0.2)]">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[17px] bg-wf-bg/30 ring-1 ring-inset ring-white/[0.06]">
                <SlideTransitionShell
                  transition={transition}
                  transitionKey={
                    verseOverride ? `v-${bibleInput.trim()}` : `deck-${previewIdx}`
                  }
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <SlideStage
                    variant="preview"
                    className="min-h-[min(74vh,920px)] w-full flex-1 rounded-none ring-0 lg:min-h-[min(62vh,820px)]"
                    title={preview.title}
                    lines={autoFormat ? preview.lines : [preview.lines.join(" · ")]}
                    layout={verseOverride ? undefined : slide.layout}
                    backgroundUrl={previewBgUrl}
                    backgroundColor={verseOverride ? undefined : stageBackground.backgroundColor}
                    backgroundFullBleed={
                      verseOverride ? undefined : stageBackground.backgroundFullBleed
                    }
                    motion={
                      !verseOverride &&
                      !stageBackground.backgroundColor?.trim() &&
                      !stageBackground.backgroundFullBleed
                    }
                    typography={
                      verseOverride
                        ? "editorial"
                        : (slide.typography ?? "editorial")
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
                      <ul className="mt-1.5 space-y-0.5 border-l border-violet-500/20 pl-2.5">
                        {item.slides.map((sl, j) => {
                          const globalIdx = startIndex + j;
                          const isHere =
                            !verseOverride && previewIdx === globalIdx;
                          return (
                            <li key={`${item.id}-${j}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setVerseOverride(null);
                                  setPreviewIdx(globalIdx);
                                }}
                                className={`w-full rounded-md px-1 py-1 text-left text-[11px] leading-snug transition ${
                                  isHere
                                    ? "bg-violet-500/15 font-medium text-violet-200"
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
              <p className="mt-2 text-[11px] text-wf-muted">Pick a setlist from the menu above.</p>
            )}
          </div>

          <div className="space-y-2 rounded-[14px] border border-white/[0.06] bg-wf-card/50 p-3 backdrop-blur-md">
          <p className="text-[11px] font-medium text-wf-muted">Look</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBgMode("ai")}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition ${
                bgMode === "ai"
                  ? "bg-violet-600/40 text-white"
                  : "bg-white/[0.05] text-wf-muted hover:text-wf-text"
              }`}
            >
              Mood A
            </button>
            <button
              type="button"
              onClick={() => setBgMode("stock")}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition ${
                bgMode === "stock"
                  ? "bg-violet-600/40 text-white"
                  : "bg-white/[0.05] text-wf-muted hover:text-wf-text"
              }`}
            >
              Mood B
            </button>
          </div>
          <div>
            <label htmlFor="wf-transition" className="text-xs text-wf-muted">
              Transition
            </label>
            <select
              id="wf-transition"
              value={
                transitionOptions.some((o) => o.id === transition)
                  ? transition
                  : transitionOptions[0]!.id
              }
              onChange={(e) => setTransition(e.target.value as SlideTransitionId)}
              className="mt-1 w-full rounded-[10px] border border-white/[0.08] bg-wf-bg/80 px-3 py-2 text-sm text-wf-text outline-none focus:ring-2 focus:ring-violet-500/30"
            >
              {transitionOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-white/[0.06] bg-wf-bg/40 px-3 py-2">
            <span className="text-xs font-medium text-wf-text">Auto-format lines</span>
            <input
              type="checkbox"
              checked={autoFormat}
              onChange={(e) => setAutoFormat(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-wf-card text-violet-500 focus:ring-violet-500/40"
            />
          </label>
          </div>
        </aside>
      </div>
    </div>
  );
}
