"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { useActiveDeck } from "@/hooks/use-active-deck";
import { useRoomSlide } from "@/hooks/use-room-slide";
import {
  BIBLE_TRANSLATION_LABELS,
  BIBLE_TRANSLATION_ORDER,
  lookupScripture,
  type BibleTranslationKey,
} from "@/lib/bible-lookup";
import type { DeckSlide } from "@/lib/setlists-catalog";
import { scriptureToSlideCards } from "@/lib/slide-engine";
import type { VerseSuggestion } from "@/lib/bible-topic-suggestions";
import { SlideTransitionShell } from "@/components/wf/slide-transition-shell";
import { SlideStage } from "@/components/wf/slide-stage";
import { useSlideTransition } from "@/hooks/use-slide-transition";
import { FREE_MAX_VERSE_BEAMS } from "@/lib/plan-limits";
import {
  incrementVerseBeamUsage,
  readVerseBeamUsageCount,
  verseBeamsRemaining,
} from "@/lib/verse-beam-usage";

function keyTargetIsFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("input, textarea, select, [contenteditable='true']");
}

const FREE_TIER_SLIDE_BRANDING = "Powered by LumenWorship";

export function PresentMode({ room }: { room: string }) {
  const { limitsApply, ready } = usePlanEntitlements();
  const [beamUsageTick, setBeamUsageTick] = useState(0);
  const deck = useActiveDeck();
  const count = Math.max(1, deck.length);
  const { index: i, go, jump, beam, publishBeam, clearBeam } = useRoomSlide({
    room,
    role: "master",
    slideCount: count,
  });

  const [quickVerseOpen, setQuickVerseOpen] = useState(false);
  const [qvQuery, setQvQuery] = useState("John 3:16");
  const [qvTranslation, setQvTranslation] = useState<BibleTranslationKey>("NIV");
  const [qvPick, setQvPick] = useState<VerseSuggestion | null>(null);
  const [qvSuggestions, setQvSuggestions] = useState<VerseSuggestion[] | null>(null);
  const [qvAiLoading, setQvAiLoading] = useState(false);
  const [qvAiError, setQvAiError] = useState<string | null>(null);
  const [qvAiNote, setQvAiNote] = useState<string | null>(null);
  const [slideTransition] = useSlideTransition();

  useEffect(() => {
    if (i > deck.length - 1) jump(0);
  }, [deck.length, i, jump]);

  const current = deck[Math.min(i, deck.length - 1)]!;
  const next = deck[Math.min(i + 1, deck.length - 1)]!;

  const qvLookup = useMemo(() => lookupScripture(qvQuery, qvTranslation), [qvQuery, qvTranslation]);
  const qvEffective = qvPick ?? qvLookup;
  const qvSlides = useMemo(
    () => scriptureToSlideCards(qvEffective.ref, qvEffective.text),
    [qvEffective.ref, qvEffective.text],
  );

  const beamSlides = beam?.slides;
  const beamIdx = beam?.index ?? 0;
  const onScreen: DeckSlide =
    beamSlides && beamSlides.length > 0
      ? beamSlides[Math.min(beamIdx, beamSlides.length - 1)]!
      : current;
  const onScreenNext: DeckSlide =
    beamSlides && beamSlides.length > 0
      ? beamSlides[Math.min(beamIdx + 1, beamSlides.length - 1)]!
      : next;

  const onScreenTransitionKey =
    beamSlides && beamSlides.length > 0 ? `beam-${beamIdx}` : `deck-${i}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (keyTargetIsFormField(e.target)) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => {
    if (!quickVerseOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuickVerseOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [quickVerseOpen]);

  const audienceHref = `/present/audience?room=${encodeURIComponent(room)}`;
  const controlHref = `/present/control?room=${encodeURIComponent(room)}`;

  const copyRoom = useCallback(() => {
    void navigator.clipboard?.writeText(room);
  }, [room]);

  const beamsUsed = useMemo(() => {
    void beamUsageTick;
    return limitsApply ? readVerseBeamUsageCount() : 0;
  }, [limitsApply, beamUsageTick]);

  const beamToAudience = useCallback(() => {
    const cards = scriptureToSlideCards(qvEffective.ref, qvEffective.text);
    if (cards.length === 0) return;
    if (limitsApply) {
      const used = readVerseBeamUsageCount();
      if (used >= FREE_MAX_VERSE_BEAMS) {
        window.alert(
          `Free plan includes ${FREE_MAX_VERSE_BEAMS} Bible verse beams to the room. Upgrade to Pro for unlimited beams.`,
        );
        return;
      }
    }
    const ref = qvEffective.ref.trim();
    const slides: DeckSlide[] = cards.map((c) => ({
      ...c,
      typography: "editorial",
      backgroundColor: "#0c0c0f",
      audienceCitation: ref,
    }));
    void publishBeam({ slides, index: 0 });
    if (limitsApply) {
      incrementVerseBeamUsage();
      setBeamUsageTick((x) => x + 1);
    }
    setQuickVerseOpen(false);
  }, [limitsApply, publishBeam, qvEffective.ref, qvEffective.text]);

  const fetchVerseIdeas = useCallback(async () => {
    const topic = qvQuery.trim();
    if (!topic) {
      setQvAiError("Type a topic or reference first.");
      return;
    }
    setQvAiLoading(true);
    setQvAiError(null);
    setQvAiNote(null);
    setQvSuggestions(null);
    setQvPick(null);
    try {
      const res = await fetch("/api/bible/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, translation: qvTranslation }),
      });
      const data = (await res.json()) as {
        suggestions?: VerseSuggestion[];
        note?: string;
        error?: string;
      };
      if (!res.ok) {
        setQvAiError(data.error ?? "Could not load suggestions.");
        return;
      }
      setQvSuggestions(data.suggestions ?? []);
      setQvAiNote(data.note ?? null);
    } catch {
      setQvAiError("Network error — try again.");
    } finally {
      setQvAiLoading(false);
    }
  }, [qvQuery, qvTranslation]);

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-black text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2 text-xs text-white/60">
        <Link
          href="/dashboard"
          className="rounded-lg px-2 py-1 hover:bg-white/10 hover:text-white"
        >
          ← Exit
        </Link>
        <div className="flex flex-wrap items-center gap-2 tabular-nums">
          <span>
            Setlist {i + 1} / {deck.length}
          </span>
          {beamSlides && beamSlides.length > 0 ? (
            <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
              Bible on screen {beamIdx + 1}/{beamSlides.length}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyRoom}
            className="rounded-lg px-2 py-1 font-mono text-[10px] text-white/80 hover:bg-white/10"
            title="Copy room id"
          >
            Room: {room}
          </button>
          <Link
            href={audienceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-2 py-1 font-medium text-violet-300 hover:bg-white/10 hover:text-violet-200"
          >
            Audience →
          </Link>
          {!limitsApply ? (
            <Link
              href={controlHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-2 py-1 font-medium text-emerald-300/90 hover:bg-white/10"
            >
              Remote →
            </Link>
          ) : (
            <span
              className="rounded-lg px-2 py-1 text-[10px] font-medium text-white/35"
              title="Remote control is a Pro feature"
            >
              Remote (Pro)
            </span>
          )}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-2 lg:gap-4 lg:p-5">
        <div className="flex min-h-0 flex-col">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/45">
            On screen
          </p>
          <SlideTransitionShell
            transition={slideTransition}
            transitionKey={onScreenTransitionKey}
            className="flex min-h-[38vh] min-h-0 flex-1 flex-col lg:min-h-0"
          >
            <SlideStage
              className="min-h-[38vh] flex-1 lg:min-h-0"
              title={onScreen.title}
              lines={onScreen.lines}
              backgroundUrl={onScreen.backgroundUrl}
              backgroundColor={onScreen.backgroundColor}
              backgroundFullBleed={onScreen.backgroundFullBleed}
              motion={!onScreen.backgroundColor?.trim() && !onScreen.backgroundFullBleed}
              typography={onScreen.typography ?? "editorial"}
              tierWatermark={ready && limitsApply ? FREE_TIER_SLIDE_BRANDING : undefined}
            />
          </SlideTransitionShell>
        </div>
        <div className="flex min-h-0 flex-col opacity-95">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/45">
            Next
          </p>
          <SlideStage
            className="min-h-[28vh] flex-1 scale-[0.98] lg:min-h-0"
            title={onScreenNext.title}
            lines={onScreenNext.lines}
            backgroundUrl={onScreenNext.backgroundUrl}
            backgroundColor={onScreenNext.backgroundColor}
            backgroundFullBleed={onScreenNext.backgroundFullBleed}
            motion={!onScreenNext.backgroundColor?.trim() && !onScreenNext.backgroundFullBleed}
            typography={onScreenNext.typography ?? "editorial"}
          />
        </div>
      </div>

      <footer className="border-t border-white/10 bg-black/80 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="rounded-[12px] border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="rounded-[12px] bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-violet-900/40"
          >
            Next
          </button>
          {beamSlides && beamSlides.length > 0 ? (
            <button
              type="button"
              onClick={() => clearBeam()}
              className="rounded-[12px] border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/20"
            >
              Back to setlist
            </button>
          ) : null}
          <select
            className="rounded-[12px] border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            value={i}
            onChange={(e) => jump(Number(e.target.value))}
            aria-label="Jump to section"
          >
            {deck.map((s, idx) => (
              <option
                key={`${idx}-${s.title}`}
                value={idx}
                className="bg-zinc-950 text-white"
              >
                {idx + 1}. {s.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setQvPick(null);
              setQvSuggestions(null);
              setQvAiError(null);
              setQvAiNote(null);
              setQuickVerseOpen(true);
            }}
            className="rounded-[12px] border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            Quick verse…
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-white/35">
          Deck comes from the <strong className="text-white/50">Dashboard</strong> setlist.{" "}
          <strong className="text-white/50">Quick verse</strong> sends scripture to Audience (and
          Remote) without adding it to the setlist. Open <strong className="text-white/50">Audience</strong>{" "}
          on the projector.
        </p>
      </footer>

      {quickVerseOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wf-quick-verse-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => setQuickVerseOpen(false)}
          />
          <div className="relative z-10 max-h-[min(90dvh,880px)] w-full max-w-2xl overflow-y-auto rounded-[20px] border border-white/15 bg-zinc-950 p-5 shadow-2xl shadow-black/60">
            <h2 id="wf-quick-verse-title" className="text-lg font-bold tracking-tight">
              Beam a verse
            </h2>
            <p className="mt-1 text-xs text-white/50">
              Type a <strong className="font-medium text-white/65">reference</strong> (spaces are
              fine) or a <strong className="font-medium text-white/65">topic</strong> like
              &quot;bible verse on the armour of God&quot;
              {limitsApply ? (
                <>
                  . On Free, use a <strong className="font-medium text-white/65">reference</strong>{" "}
                  to look up text — verse ideas (AI) are on Pro.
                </>
              ) : (
                <>
                  {" "}
                  — then use <strong className="font-medium text-white/65">Get verse ideas</strong> for
                  several options. Tap one to preview, then beam to the room.
                </>
              )}
            </p>
            {limitsApply ? (
              <p className="mt-2 text-[11px] text-amber-200/85">
                Verse beams this browser: {beamsUsed}/{FREE_MAX_VERSE_BEAMS} used ·{" "}
                {verseBeamsRemaining(beamsUsed)} left on Free
              </p>
            ) : null}
            <label htmlFor="wf-qv-ref" className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Topic or reference
            </label>
            <textarea
              id="wf-qv-ref"
              value={qvQuery}
              onChange={(e) => {
                setQvQuery(e.target.value);
                setQvPick(null);
              }}
              rows={3}
              className="mt-1 w-full resize-y rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-violet-500/30"
              placeholder='e.g. John 3:16 — or — bible verse on the armour of God'
              autoComplete="off"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!limitsApply ? (
                <button
                  type="button"
                  onClick={() => void fetchVerseIdeas()}
                  disabled={qvAiLoading}
                  aria-busy={qvAiLoading}
                  className="rounded-xl bg-gradient-to-r from-violet-600/90 to-indigo-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/25 disabled:opacity-50"
                >
                  {qvAiLoading ? "Finding verses…" : "Get verse ideas (AI)"}
                </button>
              ) : (
                <p className="text-[11px] text-white/40">
                  AI verse ideas require Pro — paste a reference (e.g. John 3:16) to beam.
                </p>
              )}
              {qvSuggestions?.length ? (
                <button
                  type="button"
                  onClick={() => {
                    setQvSuggestions(null);
                    setQvAiNote(null);
                  }}
                  className="rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-white/55 hover:bg-white/5 hover:text-white/80"
                >
                  Hide suggestions
                </button>
              ) : null}
            </div>
            {qvAiError ? <p className="mt-2 text-sm text-red-300/90">{qvAiError}</p> : null}
            {qvAiNote ? <p className="mt-2 text-[11px] text-white/45">{qvAiNote}</p> : null}

            <label htmlFor="qv-translation" className="mt-4 block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Translation
              </span>
              <select
                id="qv-translation"
                value={qvTranslation}
                onChange={(e) => {
                  setQvTranslation(e.target.value as BibleTranslationKey);
                  setQvPick(null);
                  setQvSuggestions(null);
                  setQvAiNote(null);
                }}
                className="mt-2 h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/35"
              >
                {BIBLE_TRANSLATION_ORDER.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900 text-white">
                    {t} — {BIBLE_TRANSLATION_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>

            {qvSuggestions && qvSuggestions.length > 0 ? (
              <div className="mt-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  Suggested verses — tap to preview
                </p>
                <ul className="grid max-h-[min(40vh,320px)] gap-2 overflow-y-auto sm:grid-cols-2">
                  {qvSuggestions.map((s, idx) => (
                    <li key={`${s.ref}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => setQvPick(s)}
                        className={`flex h-full w-full flex-col rounded-xl border p-3 text-left text-sm transition ${
                          qvPick?.ref === s.ref && qvPick?.text === s.text
                            ? "border-amber-500/50 bg-amber-500/10"
                            : "border-white/10 bg-white/[0.03] hover:border-violet-500/35 hover:bg-violet-500/[0.06]"
                        }`}
                      >
                        <span className="text-[11px] font-bold uppercase tracking-wide text-violet-200/90">
                          {s.ref}
                        </span>
                        <p className="mt-1 line-clamp-3 text-[13px] leading-snug text-white/85">
                          {s.text}
                        </p>
                        <span className="mt-2 line-clamp-2 text-[11px] text-white/45">{s.blurb}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/30 p-4">
              <p className="text-center text-[11px] uppercase tracking-widest text-white/35">
                Preview{qvPick ? " (selected verse)" : " (reference lookup)"}
              </p>
              <p className="mt-2 text-center text-xs font-semibold text-white/70">{qvEffective.ref}</p>
              <p className="mt-2 text-pretty text-center text-sm leading-relaxed text-white/88">
                {qvEffective.text}
              </p>
              <p className="mt-3 text-center text-[11px] text-white/40">
                {qvSlides.length} slide{qvSlides.length === 1 ? "" : "s"} on output
              </p>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickVerseOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void beamToAudience()}
                disabled={
                  qvSlides.length === 0 ||
                  (limitsApply && readVerseBeamUsageCount() >= FREE_MAX_VERSE_BEAMS)
                }
                className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-40"
              >
                Beam to audience
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
