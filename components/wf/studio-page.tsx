"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { BACKGROUND_PRESETS } from "@/lib/background-presets";
import { fetchLyricsSplitAi } from "@/lib/fetch-lyrics-split-ai";
import { lyricsToSlideCards, type SlideCard } from "@/lib/slide-engine";
import { FREE_TIER_SLIDE_BRANDING } from "@/lib/plan-limits";
import { SlideGenProgressHairline } from "@/components/wf/slide-gen-progress-hairline";
import { SlideStage } from "@/components/wf/slide-stage";
import { flushPaint, useSlideGenStatus } from "@/hooks/use-slide-gen-status";

const SAMPLE = `[Verse 1]
You call me out upon the waters
The great unknown where feet may fail

[Chorus]
Spirit lead me where my trust is without borders`;

export function StudioPage() {
  const { limitsApply, ready: planReady } = usePlanEntitlements();
  const [raw, setRaw] = useState(SAMPLE);
  const [splitTitle, setSplitTitle] = useState("");
  const [linesPerSlide, setLinesPerSlide] = useState(3);
  const [bg, setBg] = useState(BACKGROUND_PRESETS[0]!.url);
  const [bridgePrompt, setBridgePrompt] = useState("");
  const [bridgeLines, setBridgeLines] = useState<string[] | null>(null);
  const [bridgeSlides, setBridgeSlides] = useState<{ title: string; lines: string[] }[] | null>(null);
  const [bridgeNote, setBridgeNote] = useState<string | null>(null);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [aiSplitCards, setAiSplitCards] = useState<SlideCard[] | null>(null);
  const [splitNote, setSplitNote] = useState<string | null>(null);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  const lyricsAtSplitRef = useRef<string | null>(null);
  const [aiStatus, setAiStatus] = useState<{
    openaiConfigured: boolean;
    model: string | null;
    dummyFallbackAllowed: boolean;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/ai/status")
      .then((r) => r.json())
      .then((j: { openaiConfigured?: boolean; model?: string | null; dummyFallbackAllowed?: boolean }) => {
        setAiStatus({
          openaiConfigured: Boolean(j.openaiConfigured),
          model: typeof j.model === "string" ? j.model : null,
          dummyFallbackAllowed: Boolean(j.dummyFallbackAllowed),
        });
      })
      .catch(() => setAiStatus(null));
  }, []);

  useEffect(() => {
    setAiSplitCards(null);
    setSplitNote(null);
    setSplitError(null);
    lyricsAtSplitRef.current = null;
  }, [linesPerSlide]);

  const localCards = useMemo(() => lyricsToSlideCards(raw, linesPerSlide), [raw, linesPerSlide]);
  const cards = aiSplitCards ?? localCards;
  const splitStale = Boolean(aiSplitCards && lyricsAtSplitRef.current !== null && lyricsAtSplitRef.current !== raw);
  const splitStatusLine = useSlideGenStatus(splitLoading);

  const preview = cards[0] ?? { title: "Preview", lines: ["Paste lyrics to begin"] };

  async function runAiSplit() {
    if (!raw.trim()) return;
    setSplitError(null);
    setAiSplitCards(lyricsToSlideCards(raw, linesPerSlide));
    setSplitNote("Quick layout shown — refining with AI…");
    setSplitLoading(true);
    await flushPaint();
    try {
      const out = await fetchLyricsSplitAi(raw, {
        title: splitTitle.trim(),
        maxLinesPerSlide: linesPerSlide,
      });
      if (out.ok) {
        setAiSplitCards(out.slides);
        setSplitNote(out.note ?? (out.structure ? `Structure: ${out.structure}` : null));
        lyricsAtSplitRef.current = raw;
      } else {
        setSplitError(out.error);
        setAiSplitCards(null);
        setSplitNote(null);
        lyricsAtSplitRef.current = null;
      }
    } finally {
      setSplitLoading(false);
    }
  }

  function clearAiSplit() {
    setAiSplitCards(null);
    setSplitNote(null);
    setSplitError(null);
    lyricsAtSplitRef.current = null;
  }

  async function generateBridge() {
    setBridgeLoading(true);
    setBridgeLines(null);
    setBridgeSlides(null);
    setBridgeNote(null);
    try {
      const r = await fetch("/api/ai/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: bridgePrompt }),
      });
      const j = (await r.json()) as {
        error?: string;
        details?: string;
        lines?: string[];
        slideSuggestions?: { title: string; lines: string[] }[];
        note?: string;
      };
      if (!r.ok) {
        let err =
          typeof j.error === "string"
            ? j.error
            : `Bridge request failed (${r.status}).`;
        if (typeof j.details === "string" && j.details.trim()) {
          err = `${err}\n${j.details.trim()}`;
        }
        setBridgeLines([err]);
        return;
      }
      if (Array.isArray(j.lines)) setBridgeLines(j.lines);
      if (Array.isArray(j.slideSuggestions)) setBridgeSlides(j.slideSuggestions);
      if (typeof j.note === "string") setBridgeNote(j.note);
    } catch {
      setBridgeLines(["Could not reach AI bridge (offline?)"]);
    } finally {
      setBridgeLoading(false);
    }
  }

  if (planReady && limitsApply) {
    return (
      <div className="mx-auto max-w-lg p-6 lg:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Slide Studio</h1>
        <p className="mt-3 text-sm leading-relaxed text-wf-muted">
          AI lyrics splitting and the spontaneous bridge lab are Pro features. On Free, open{" "}
          <Link href="/songs" className="font-medium text-sky-400 hover:underline">
            Songs
          </Link>{" "}
          and use <strong className="font-medium text-wf-text">Enter manually</strong> — slides still split
          locally with no API calls.
        </p>
        <Link
          href="/upgrade"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[14px] bg-blue-600 hover:bg-blue-500 px-6 text-sm font-semibold text-white shadow-lg shadow-black/30"
        >
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Slide Studio</h1>
        <p className="mt-1 max-w-2xl text-sm text-wf-muted">
          One song in worshipflow2 = <strong className="font-medium text-wf-text">many slides</strong>.
          Use <strong className="font-medium text-wf-text/90">Split with AI</strong> for section-aware
          layout, or the <strong className="font-medium text-wf-text/90">rule-based</strong> preview below.
          Save songs in{" "}
          <Link href="/songs" className="text-sky-400 hover:underline">
            Songs
          </Link>{" "}
          for Present.{" "}
          {aiStatus?.openaiConfigured ? (
            <span className="text-xs text-emerald-200/90">Smart split is on.</span>
          ) : aiStatus?.dummyFallbackAllowed ? (
            <span className="text-xs text-amber-200/85">Preview mode — sample splits only.</span>
          ) : (
            <span className="text-xs text-amber-200/85">
              Smart split needs server setup — see{" "}
              <Link href="/settings" className="text-sky-400 hover:underline">
                Settings
              </Link>
              .
            </span>
          )}
        </p>
        <p className="mt-2 text-xs text-wf-muted">
          <Link href="/tutorial" className="text-sky-400 hover:underline">
            Tutorial
          </Link>{" "}
          · Spontaneous bridge uses the same API.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-[18px] border border-white/[0.08] bg-wf-card/50 p-4 backdrop-blur-xl">
            <label htmlFor="lyrics" className="text-xs font-semibold uppercase tracking-wider text-wf-muted">
              Raw lyrics
            </label>
            <textarea
              id="lyrics"
              data-wf-tour="tour-studio-lyrics"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={14}
              className="mt-2 w-full resize-y rounded-[14px] border border-white/[0.08] bg-wf-bg/60 px-3 py-2 font-mono text-sm leading-relaxed text-wf-text outline-none focus:ring-2 focus:ring-sky-500/25"
              placeholder="Paste lyrics… Use [Verse], [Chorus], [Bridge] or blank lines between sections."
            />
            <label htmlFor="split-title" className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-wf-muted">
              Song title (optional — helps AI split)
            </label>
            <input
              id="split-title"
              value={splitTitle}
              onChange={(e) => setSplitTitle(e.target.value)}
              placeholder="e.g. Oceans (Where Feet May Fail)"
              className="mt-1 h-10 w-full rounded-[12px] border border-white/[0.08] bg-wf-bg/60 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/25"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-wf-muted">
                Max lines / slide
                <select
                  value={linesPerSlide}
                  onChange={(e) => setLinesPerSlide(Number(e.target.value))}
                  className="rounded-lg border border-white/[0.08] bg-wf-bg/80 px-2 py-1 text-wf-text"
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void runAiSplit()}
                disabled={splitLoading || !raw.trim()}
                className="rounded-[12px] bg-gradient-to-r from-emerald-600/90 to-teal-600/90 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {splitLoading ? "Splitting…" : "Split with AI"}
              </button>
              {aiSplitCards ? (
                <button
                  type="button"
                  onClick={clearAiSplit}
                  disabled={splitLoading}
                  className="rounded-[12px] border border-white/[0.12] px-3 py-2 text-xs font-medium text-wf-muted hover:text-wf-text disabled:opacity-35"
                >
                  Use rule-based only
                </button>
              ) : null}
            </div>
            <div className="mt-2">
              <SlideGenProgressHairline active={splitLoading} />
            </div>
            {splitLoading && splitStatusLine ? (
              <p className="mt-2 text-[11px] text-sky-200/85">{splitStatusLine}</p>
            ) : null}
            {splitStale ? (
              <p className="mt-2 text-[11px] text-amber-200/90">
                Lyrics changed since the last AI split — click <strong>Split with AI</strong> again to refresh.
              </p>
            ) : null}
            {splitError ? (
              <p className="mt-2 text-[11px] leading-snug text-red-300/90 whitespace-pre-wrap">{splitError}</p>
            ) : null}
            {!splitLoading && splitNote && aiSplitCards ? (
              <p className="mt-2 text-[11px] leading-snug text-wf-muted">{splitNote}</p>
            ) : null}
          </div>

          <div className="rounded-[18px] border border-white/[0.08] bg-wf-card/50 p-4 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-wf-muted">
              Spontaneous bridge
            </p>
            <input
              value={bridgePrompt}
              onChange={(e) => setBridgePrompt(e.target.value)}
              placeholder='e.g. "Write a 4-line bridge about God’s peace"'
              className="mt-2 h-11 w-full rounded-[12px] border border-white/[0.08] bg-wf-bg/60 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/25"
            />
            <button
              type="button"
              onClick={() => void generateBridge()}
              disabled={bridgeLoading || !bridgePrompt.trim()}
              className="mt-3 rounded-[12px] bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {bridgeLoading ? "Generating…" : "Generate & format"}
            </button>
            {bridgeNote ? (
              <p className="mt-2 text-[11px] leading-snug text-wf-muted">{bridgeNote}</p>
            ) : null}
            {bridgeLines ? (
              <ul className="mt-3 space-y-1 rounded-[12px] border border-white/[0.06] bg-wf-bg/40 p-3 text-sm text-wf-text">
                {bridgeLines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            ) : null}
            {bridgeSlides && bridgeSlides.length > 0 ? (
              <div className="mt-4 rounded-[12px] border border-sky-500/15 bg-sky-500/[0.06] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-200/90">
                  Suggested slide pairs ({bridgeSlides.length} slides)
                </p>
                <ul className="mt-2 space-y-2 text-xs text-wf-muted">
                  {bridgeSlides.map((s, i) => (
                    <li key={i} className="rounded-lg border border-white/[0.06] bg-wf-bg/30 px-2 py-2">
                      <span className="font-semibold text-wf-text">{s.title}</span>
                      <span className="mt-1 block text-[11px]">{s.lines.join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-wf-muted">
              Background (Unsplash presets)
            </p>
            <div className="flex flex-wrap gap-2">
              {BACKGROUND_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setBg(p.url)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    bg === p.url
                      ? "border-sky-500/35 bg-sky-500/12 text-wf-text"
                      : "border-white/[0.08] text-wf-muted hover:border-white/20"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <SlideStage
            title={preview.title}
            lines={preview.lines}
            backgroundUrl={bg}
            motion
            typography="editorial"
            tierWatermark={
              planReady && limitsApply ? FREE_TIER_SLIDE_BRANDING : undefined
            }
          />
          <div className="rounded-[16px] border border-white/[0.06] bg-wf-card/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-wf-muted">
              Slide breakdown — {cards.length} slide{cards.length === 1 ? "" : "s"}{" "}
              <span className="font-normal text-wf-muted/70">
                ({aiSplitCards ? "AI layout" : "rule-based preview"})
              </span>
            </p>
            <p className="mt-1 text-[11px] text-wf-muted/90">
              Each row is one presenter step. Copy into Songs or refine there.
            </p>
            <ul className="mt-2 max-h-48 space-y-2 overflow-auto text-xs text-wf-muted">
              {cards.map((c, idx) => (
                <li key={idx} className="rounded-lg border border-white/[0.04] bg-wf-bg/30 px-2 py-1.5">
                  <span className="font-semibold text-wf-text">
                    {idx + 1}. {c.title}
                  </span>
                  <span className="block text-[11px] opacity-80">{c.lines.join(" / ")}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
