"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import {
  markFreeTierAiSongSplitUsed,
  readFreeTierAiSongSplitUsed,
} from "@/lib/free-ai-song-usage";
import { BackgroundUploadControl } from "@/components/wf/background-upload-control";
import { fetchSongPresentStyling } from "@/lib/fetch-song-present-styling";
import { BACKGROUND_PRESETS, BACKGROUND_SOLID_SWATCHES } from "@/lib/background-presets";
import {
  FREE_BACKGROUND_PRESET_IDS,
  FREE_SOLID_SWATCH_COUNT,
} from "@/lib/plan-limits";
import { lyricsToSlideCards } from "@/lib/slide-engine";
import { isDataUrlImage } from "@/lib/read-image-data-url";
import type { LibrarySong } from "@/lib/songs-catalog";
import { googleLyricsSearchUrl } from "@/lib/google-lyrics-search";
import { MIN_LYRICS_CHARS_FOR_AI_SLIDES, LYRICS_REQUIRED_MESSAGE } from "@/lib/song-ai-policy";
import { addUserSongAsync, createNewUserSong } from "@/lib/user-songs-storage";
import { SlideGenProgressHairline } from "@/components/wf/slide-gen-progress-hairline";
import { flushPaint, useSlideGenStatus } from "@/hooks/use-slide-gen-status";

type Step = "choose" | "ai-meta" | "ai-review" | "manual";

type ReviewSlide = { title: string; lines: string[] };

function parseTags(csv: string): string[] {
  return csv
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function WizardBackgroundPicker(props: {
  imageUrl: string | undefined;
  solidColor: string | undefined;
  onImageUrlChange: (next: string | undefined) => void;
  onSolidColorChange: (next: string | undefined) => void;
  planLimited?: boolean;
}) {
  const { imageUrl, solidColor, onImageUrlChange, onSolidColorChange, planLimited = false } = props;
  const imageActive = (u: string) => imageUrl === u && !solidColor?.trim();
  const freeIds = new Set<string>(FREE_BACKGROUND_PRESET_IDS);
  const presets = planLimited
    ? BACKGROUND_PRESETS.filter((p) => freeIds.has(p.id))
    : BACKGROUND_PRESETS;
  const solids = planLimited
    ? BACKGROUND_SOLID_SWATCHES.slice(0, FREE_SOLID_SWATCH_COUNT)
    : [...BACKGROUND_SOLID_SWATCHES];
  return (
    <div className="mt-3 rounded-xl border border-white/[0.06] bg-wf-bg/25 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-wf-muted">
        Background (all slides)
      </p>
      {planLimited ? (
        <p className="mt-1 text-[10px] leading-snug text-amber-200/80">
          Free plan: core stock stills and a few colours only.
        </p>
      ) : (
        <p className="mt-1 text-[10px] leading-snug text-wf-muted">
          Stock still, upload, or solid colour. Solid overrides an image in Present.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map((p) => {
          const active = imageActive(p.url);
          return (
            <button
              key={p.id}
              type="button"
              title={p.label}
              onClick={() => {
                onSolidColorChange(undefined);
                onImageUrlChange(p.url);
              }}
              className={`h-11 w-11 overflow-hidden rounded-lg border-2 transition ${
                active ? "border-sky-500/40 ring-2 ring-sky-500/30" : "border-white/10"
              }`}
            >
              <span
                className="block h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${p.url})` }}
              />
            </button>
          );
        })}
        {!planLimited ? (
          <BackgroundUploadControl
            variant="tile"
            isActive={Boolean(imageUrl && isDataUrlImage(imageUrl) && !solidColor?.trim())}
            onDataUrl={(u) => {
              onSolidColorChange(undefined);
              onImageUrlChange(u);
            }}
          />
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-wf-muted">Colour</span>
        {solids.map((hex) => {
          const active = solidColor === hex;
          return (
            <button
              key={hex}
              type="button"
              onClick={() => {
                onImageUrlChange(undefined);
                onSolidColorChange(hex);
              }}
              className={`h-8 w-8 rounded-lg border-2 ${
                active ? "border-sky-500/40 ring-2 ring-sky-500/30" : "border-white/15"
              }`}
              style={{ backgroundColor: hex }}
              title={hex}
            />
          );
        })}
        {!planLimited ? (
          <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-[10px] text-wf-muted">
            <span>Custom</span>
            <input
              type="color"
              value={solidColor?.startsWith("#") ? solidColor : "#1e1b4b"}
              onChange={(e) => {
                onImageUrlChange(undefined);
                onSolidColorChange(e.target.value);
              }}
              className="h-8 w-10 cursor-pointer rounded border border-white/15 bg-transparent"
            />
          </label>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => {
          onImageUrlChange(undefined);
          onSolidColorChange(undefined);
        }}
        className="mt-2 text-[11px] font-medium text-wf-muted hover:text-wf-text"
      >
        Clear background (use app default in Present)
      </button>
    </div>
  );
}

export function NewSongWizardModal(props: {
  open: boolean;
  onClose: () => void;
  onSongCreated: (song: LibrarySong) => void;
  /** Extra line under the modal title (e.g. setlist context) */
  contextHint?: string;
  /** Label for the final confirm on AI review + manual steps */
  confirmPrimaryLabel?: string;
}) {
  const { open, onClose, onSongCreated, contextHint, confirmPrimaryLabel = "Add to library" } = props;

  const { limitsApply } = usePlanEntitlements();

  const [step, setStep] = useState<Step>("choose");
  const [freeAiSongUsed, setFreeAiSongUsed] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [tags, setTags] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [reviewSlides, setReviewSlides] = useState<ReviewSlide[]>([]);
  const [reviewStructure, setReviewStructure] = useState("Custom");
  const [reviewBackgroundUrl, setReviewBackgroundUrl] = useState<string | undefined>();
  const [reviewBackgroundColor, setReviewBackgroundColor] = useState<string | undefined>();
  const [reviewNote, setReviewNote] = useState("");

  const googleSongQuery = useMemo(() => `${title} ${artist}`.trim() || title.trim(), [title, artist]);

  useEffect(() => {
    if (!open) {
      setStep("choose");
      setTitle("");
      setArtist("");
      setTags("");
      setLyrics("");
      setAiLoading(false);
      setReviewSlides([]);
      setReviewStructure("Custom");
      setReviewBackgroundUrl(undefined);
      setReviewBackgroundColor(undefined);
      setReviewNote("");
    } else {
      setFreeAiSongUsed(readFreeTierAiSongSplitUsed());
    }
  }, [open]);

  const showAiNewSongOption = !limitsApply || !freeAiSongUsed;
  const aiGenStatusLine = useSlideGenStatus(aiLoading);

  const updateReviewSlide = useCallback((si: number, field: "title" | "lines", value: string | string[]) => {
    setReviewSlides((slides) => {
      const next = [...slides];
      const sl = { ...next[si]! };
      if (field === "title") sl.title = value as string;
      else sl.lines = value as string[];
      next[si] = sl;
      return next;
    });
  }, []);

  const addReviewSlide = useCallback(() => {
    setReviewSlides((s) => [
      ...s,
      { title: `Slide ${s.length + 1}`, lines: [""] },
    ]);
  }, []);

  const removeReviewSlide = useCallback((si: number) => {
    setReviewSlides((s) => (s.length <= 1 ? s : s.filter((_, i) => i !== si)));
  }, []);

  const moveReviewSlide = useCallback((si: number, delta: number) => {
    setReviewSlides((slides) => {
      const j = si + delta;
      if (j < 0 || j >= slides.length) return slides;
      const next = [...slides];
      const tmp = next[si]!;
      next[si] = next[j]!;
      next[j] = tmp;
      return next;
    });
  }, []);

  const runAiGenerate = useCallback(async () => {
    if (!title.trim()) return;
    if (limitsApply && readFreeTierAiSongSplitUsed()) {
      window.alert(
        "On the Free plan you get AI slide splitting for one new song. You’ve already used it — add songs manually or upgrade to Pro for unlimited AI.",
      );
      return;
    }
    const optimistic = lyricsToSlideCards(lyrics.trim(), 3).map((c) => ({
      title: c.title,
      lines: [...c.lines],
    }));
    setReviewSlides(optimistic);
    setReviewStructure("Custom");
    setReviewBackgroundUrl(undefined);
    setReviewBackgroundColor(undefined);
    setReviewNote("");
    setStep("ai-review");
    setAiLoading(true);
    await flushPaint();
    try {
      const outcome = await fetchSongPresentStyling(title.trim(), lyrics.trim(), artist.trim());
      if (outcome.ok) {
        const styled = outcome.data;
        setReviewSlides(styled.slides.map((s) => ({ title: s.title, lines: [...s.lines] })));
        if (styled.structure?.trim()) setReviewStructure(styled.structure.trim());
        setReviewBackgroundUrl(styled.backgroundUrl);
        setReviewBackgroundColor(undefined);
        setReviewNote(styled.note ?? "");
      } else {
        setReviewSlides([
          {
            title: `${title.trim()} · Slide 1`,
            lines: ["(AI could not run)", outcome.error],
          },
        ]);
        setReviewStructure("Custom");
        setReviewBackgroundUrl(undefined);
        setReviewBackgroundColor(undefined);
        setReviewNote(outcome.error);
      }
    } finally {
      setAiLoading(false);
    }
  }, [artist, limitsApply, lyrics, title]);

  const confirmAiAdd = useCallback(async () => {
    if (!title.trim() || reviewSlides.length === 0) return;
    const slides = reviewSlides.map((s) => {
      const lines = s.lines.map((l) => l.trimEnd()).filter((l) => l.length > 0);
      return { title: s.title, lines: lines.length ? lines : [""] };
    });
    const normalized =
      slides.length > 0
        ? slides
        : [{ title: "Slide 1", lines: [""] as string[] }];
    const song = createNewUserSong({
      title: title.trim(),
      tags: parseTags(tags),
      structure: reviewStructure,
      slides: normalized,
      backgroundUrl: reviewBackgroundColor?.trim() ? undefined : reviewBackgroundUrl,
      backgroundColor: reviewBackgroundColor?.trim(),
    });
    const saved = await addUserSongAsync(song);
    if (limitsApply) {
      markFreeTierAiSongSplitUsed();
      setFreeAiSongUsed(true);
    }
    onSongCreated(saved);
  }, [
    limitsApply,
    onSongCreated,
    reviewBackgroundColor,
    reviewBackgroundUrl,
    reviewSlides,
    reviewStructure,
    tags,
    title,
  ]);

  const confirmManualAdd = useCallback(async () => {
    if (!title.trim()) return;
    const cards = lyricsToSlideCards(lyrics.trim() || "Line one\nLine two", 3);
    const slides = cards.map((c) => ({ title: c.title, lines: [...c.lines] }));
    const song = createNewUserSong({
      title: title.trim(),
      tags: parseTags(tags),
      structure: "Custom",
      slides: slides.length ? slides : [{ title: "Slide 1", lines: [""] }],
      backgroundUrl: reviewBackgroundColor?.trim() ? undefined : reviewBackgroundUrl,
      backgroundColor: reviewBackgroundColor?.trim(),
    });
    const saved = await addUserSongAsync(song);
    onSongCreated(saved);
  }, [lyrics, onSongCreated, reviewBackgroundColor, reviewBackgroundUrl, tags, title]);

  if (!open) return null;

  const maxW =
    step === "ai-review" ? "max-w-2xl" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[90vh] w-full ${maxW} overflow-y-auto rounded-[18px] border border-white/[0.1] bg-wf-card p-5 shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-song-wizard-title"
      >
        <h2 id="new-song-wizard-title" className="text-lg font-bold text-wf-text">
          New song
        </h2>
        {contextHint ? (
          <p className="mt-1 text-[11px] leading-snug text-wf-muted">{contextHint}</p>
        ) : null}

        {step === "choose" ? (
          <>
            {limitsApply && showAiNewSongOption ? (
              <p className="mt-3 text-xs text-wf-muted">
                <strong className="font-medium text-wf-text">Free plan:</strong> you can use{" "}
                <strong className="font-medium text-wf-text">AI slide splitting once</strong> for a new song
                (then manual only for more songs). Pro includes unlimited AI here and across Slide Studio.
              </p>
            ) : limitsApply ? (
              <p className="mt-3 text-xs text-wf-muted">
                <strong className="font-medium text-wf-text">Free plan:</strong> you’ve already used your one
                AI-assisted new song — use <strong className="font-medium text-wf-text">manual</strong> entry, or
                upgrade to Pro for unlimited AI splitting.
              </p>
            ) : (
              <p className="mt-3 text-xs text-wf-muted">
                Choose how to build slides. <strong className="font-medium text-wf-text">AI</strong> splits
                lyrics you paste (it does not search the web or invent copyrighted words).{" "}
                <strong className="font-medium text-wf-text">Manual</strong> uses local splitting only — no API
                call.
              </p>
            )}
            <div className={`mt-5 grid gap-3 ${showAiNewSongOption ? "sm:grid-cols-2" : ""}`}>
              {showAiNewSongOption ? (
                <button
                  type="button"
                  onClick={() => setStep("ai-meta")}
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-4 text-left transition hover:border-sky-400/45 hover:bg-slate-1000/[0.14]"
                >
                  <span className="text-sm font-semibold text-slate-100">Use AI</span>
                  <span className="mt-1 block text-[11px] text-wf-muted">
                    Paste licensed lyrics → AI splits into slides → you edit → add to library
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setStep("manual")}
                className="rounded-xl border border-white/[0.12] bg-wf-bg/40 px-4 py-4 text-left transition hover:border-white/[0.2] hover:bg-wf-bg/55"
              >
                <span className="text-sm font-semibold text-wf-text">Enter manually</span>
                <span className="mt-1 block text-[11px] text-wf-muted">
                  Paste lyrics and tags; slides split locally (no AI)
                </span>
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-wf-muted"
              >
                Cancel
              </button>
            </div>
          </>
        ) : null}

        {step === "ai-meta" ? (
          <>
            <p className="mt-2 text-[11px] text-wf-muted">
              Paste lyrics from your licensed source (SongSelect, chord chart, etc.). AI only splits what you
              paste—it won’t look up or make up the song. Nothing is saved until you finish review.
            </p>
            <label className="mt-4 block">
              <span className="text-[10px] text-wf-muted">Song title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. No One Like The Lord"
                className="mt-0.5 h-10 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 text-sm"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-[10px] text-wf-muted">Artist (optional)</span>
              <input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Bethel Music"
                className="mt-0.5 h-10 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 text-sm"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-[10px] text-wf-muted">Tags (comma-separated)</span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Worship, Opener"
                className="mt-0.5 h-9 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 text-sm"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-[10px] text-wf-muted">
                Lyrics (required for AI — min {MIN_LYRICS_CHARS_FOR_AI_SLIDES} characters)
              </span>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Paste the full lyrics you’re licensed to display…"
                rows={8}
                className="mt-0.5 w-full resize-y rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 py-2 font-mono text-xs leading-relaxed"
              />
            </label>
            {lyrics.trim().length > 0 && lyrics.trim().length < MIN_LYRICS_CHARS_FOR_AI_SLIDES ? (
              <p className="mt-2 text-[11px] text-amber-200/90">{LYRICS_REQUIRED_MESSAGE}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
              <a
                href={googleLyricsSearchUrl(googleSongQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-400 underline-offset-2 hover:underline"
                title={
                  googleSongQuery
                    ? `Google: ${googleSongQuery} lyrics`
                    : "Google search: song title + lyrics"
                }
              >
                {googleSongQuery
                  ? `Google “${googleSongQuery} lyrics”`
                  : "Google song lyrics (add title above)"}
              </a>
              <a
                href={`https://songselect.ccli.com/search?SearchText=${encodeURIComponent(`${title} ${artist}`.trim() || title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-400/90 underline-offset-2 hover:underline"
              >
                SongSelect (CCLI)
              </a>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep("choose")}
                disabled={aiLoading}
                className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-wf-muted disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={aiLoading}
                className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-wf-muted disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runAiGenerate()}
                disabled={
                  !title.trim() ||
                  lyrics.trim().length < MIN_LYRICS_CHARS_FOR_AI_SLIDES ||
                  aiLoading
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                title={
                  lyrics.trim().length < MIN_LYRICS_CHARS_FOR_AI_SLIDES
                    ? `Paste at least ${MIN_LYRICS_CHARS_FOR_AI_SLIDES} characters of lyrics`
                    : undefined
                }
              >
                {aiLoading ? "Generating slides…" : "Generate slides"}
              </button>
            </div>
          </>
        ) : null}

        {step === "ai-review" ? (
          <>
            <div className="mt-3">
              <SlideGenProgressHairline active={aiLoading} />
            </div>
            {aiLoading && aiGenStatusLine ? (
              <p className="mt-2 text-[11px] text-sky-200/85">{aiGenStatusLine}</p>
            ) : null}
            {reviewNote ? (
              <p className="mt-2 rounded-lg border border-white/[0.06] bg-wf-bg/30 px-3 py-2 text-[11px] text-wf-muted">
                {reviewNote}
              </p>
            ) : null}
            <label className="mt-3 block">
              <span className="text-[10px] text-wf-muted">Tags (comma-separated)</span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-0.5 h-9 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 text-sm"
              />
            </label>
            <WizardBackgroundPicker
              imageUrl={reviewBackgroundUrl}
              solidColor={reviewBackgroundColor}
              onImageUrlChange={setReviewBackgroundUrl}
              onSolidColorChange={setReviewBackgroundColor}
              planLimited={limitsApply}
            />
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-wf-muted">
              Review slides
            </p>
            <div
              className={`mt-2 space-y-3 transition-opacity duration-200 ${aiLoading ? "pointer-events-none opacity-[0.88]" : ""}`}
              aria-busy={aiLoading}
            >
              {reviewSlides.map((slide, si) => (
                <div key={si} className="rounded-xl border border-white/[0.06] bg-wf-bg/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] tabular-nums text-wf-muted">#{si + 1}</span>
                    <input
                      value={slide.title}
                      onChange={(e) => updateReviewSlide(si, "title", e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-white/[0.06] bg-transparent px-2 py-1 text-xs font-medium"
                    />
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveReviewSlide(si, -1)}
                        disabled={si === 0}
                        className="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-wf-muted hover:bg-white/[0.06] disabled:opacity-25"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveReviewSlide(si, 1)}
                        disabled={si >= reviewSlides.length - 1}
                        className="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-wf-muted hover:bg-white/[0.06] disabled:opacity-25"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeReviewSlide(si)}
                        disabled={reviewSlides.length <= 1}
                        className="text-[11px] text-wf-muted hover:text-red-300 disabled:opacity-30"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={slide.lines.join("\n")}
                    onChange={(e) =>
                      updateReviewSlide(si, "lines", e.target.value.split(/\r?\n/))
                    }
                    rows={Math.min(8, Math.max(2, slide.lines.length + 1))}
                    className="mt-2 w-full resize-y rounded-lg border border-white/[0.06] bg-wf-bg/40 px-2 py-2 font-mono text-xs"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addReviewSlide}
                className="text-[11px] font-medium text-sky-400 hover:text-sky-200"
              >
                + Add slide
              </button>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep("ai-meta")}
                disabled={aiLoading}
                className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-wf-muted disabled:opacity-40"
              >
                Back
              </button>
              <button type="button" onClick={onClose} className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-wf-muted">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmAiAdd()}
                disabled={!title.trim() || aiLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {confirmPrimaryLabel}
              </button>
            </div>
          </>
        ) : null}

        {step === "manual" ? (
          <>
            <p className="mt-2 text-[11px] text-wf-muted">
              Slides are split from your lyrics (about three lines per slide). No AI request.
            </p>
            <label className="mt-3 block">
              <span className="text-[10px] text-wf-muted">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-0.5 h-10 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 text-sm"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-[10px] text-wf-muted">Tags (comma-separated)</span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-0.5 h-9 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 text-sm"
              />
            </label>
            <WizardBackgroundPicker
              imageUrl={reviewBackgroundUrl}
              solidColor={reviewBackgroundColor}
              onImageUrlChange={setReviewBackgroundUrl}
              onSolidColorChange={setReviewBackgroundColor}
              planLimited={limitsApply}
            />
            <label className="mt-3 block">
              <span className="text-[10px] text-wf-muted">Lyrics (blank lines between sections)</span>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={8}
                className="mt-0.5 w-full resize-y rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 py-2 font-mono text-xs"
                placeholder={"[Verse]\nLine one\n\n[Chorus]\nChorus here"}
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-wf-muted"
              >
                Back
              </button>
              <button type="button" onClick={onClose} className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-wf-muted">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmManualAdd()}
                disabled={!title.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {confirmPrimaryLabel}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
