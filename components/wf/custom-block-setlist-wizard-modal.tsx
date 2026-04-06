"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomSetlistBlockKind } from "@/lib/ai-dummy-data";
import { fetchCustomSetlistBlockAi } from "@/lib/fetch-custom-setlist-block-ai";
import type { DeckSlide, SetlistItemKind, SlideTypography } from "@/lib/setlists-catalog";
import { kindLabel } from "@/lib/setlists-catalog";

type Step = "choose" | "ai-input" | "ai-review" | "manual";

type ReviewSlide = { title: string; lines: string[] };

function defaultNameForKind(kind: CustomSetlistBlockKind): string {
  if (kind === "prayer") return "Prayer";
  if (kind === "moment") return "Moment";
  return "Custom";
}

export function CustomBlockSetlistWizardModal(props: {
  open: boolean;
  kind: CustomSetlistBlockKind;
  onClose: () => void;
  onAdd: (payload: {
    kind: CustomSetlistBlockKind;
    name: string;
    slides: DeckSlide[];
    itemBackgroundUrl?: string;
    itemBackgroundColor?: string;
    itemTypography?: SlideTypography;
  }) => void;
}) {
  const { open, kind, onClose, onAdd } = props;

  const [step, setStep] = useState<Step>("choose");
  const [prompt, setPrompt] = useState("");
  const [contentMode, setContentMode] = useState<"ai_text" | "user_text">("user_text");
  const [rowLabel, setRowLabel] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [reviewSlides, setReviewSlides] = useState<ReviewSlide[]>([]);
  const [itemBackgroundUrl, setItemBackgroundUrl] = useState<string | undefined>();
  const [itemTypography, setItemTypography] = useState<SlideTypography>("editorial");
  const [aiNote, setAiNote] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("choose");
      setPrompt("");
      setContentMode("user_text");
      setRowLabel("");
      setAiLoading(false);
      setReviewSlides([]);
      setItemBackgroundUrl(undefined);
      setItemTypography("editorial");
      setAiNote("");
    } else {
      setRowLabel(defaultNameForKind(kind));
    }
  }, [open, kind]);

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
    setReviewSlides((s) => [...s, { title: `Slide ${s.length + 1}`, lines: [""] }]);
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
    setAiLoading(true);
    try {
      const outcome = await fetchCustomSetlistBlockAi(kind, prompt, contentMode);
      if (outcome.ok) {
        const payload = outcome.data;
        setReviewSlides(payload.slides.map((s) => ({ title: s.title, lines: [...s.lines] })));
        setItemBackgroundUrl(payload.backgroundUrl);
        setItemTypography(payload.itemTypography);
        setAiNote(payload.note ?? "");
      } else {
        setReviewSlides([{ title: "Slide 1", lines: ["(AI could not run)", outcome.error] }]);
        setItemBackgroundUrl(undefined);
        setAiNote(outcome.error);
      }
      setStep("ai-review");
    } finally {
      setAiLoading(false);
    }
  }, [contentMode, kind, prompt]);

  const confirmAiAdd = useCallback(() => {
    const name = rowLabel.trim() || defaultNameForKind(kind);
    const slides: DeckSlide[] = reviewSlides.map((s) => {
      const lines = s.lines.map((l) => l.trimEnd()).filter((l) => l.length > 0);
      return { title: s.title, lines: lines.length ? lines : [""] };
    });
    if (!slides.length) return;
    onAdd({
      kind,
      name,
      slides,
      itemBackgroundUrl: itemBackgroundUrl?.trim() || undefined,
      itemTypography,
    });
  }, [itemBackgroundUrl, itemTypography, kind, onAdd, reviewSlides, rowLabel]);

  const confirmManualAdd = useCallback(() => {
    onAdd({
      kind,
      name: rowLabel.trim() || defaultNameForKind(kind),
      slides: [{ title: "Slide 1", lines: [""] }],
    });
  }, [kind, onAdd, rowLabel]);

  if (!open) return null;

  const maxW = step === "ai-review" ? "max-w-2xl" : "max-w-lg";
  const kindTitle = kindLabel(kind as SetlistItemKind);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[90vh] w-full ${maxW} overflow-y-auto rounded-[18px] border border-white/[0.1] bg-wf-card p-5 shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-block-wizard-title"
      >
        <h2 id="custom-block-wizard-title" className="text-lg font-bold text-wf-text">
          Add {kindTitle}
        </h2>
        <p className="mt-1 text-[11px] text-wf-muted">
          AI can pick a <strong className="font-medium text-wf-text/90">background</strong> for this block.
          You can type slide lines yourself or use sample text (dummy). Everything is saved with the
          setlist.
        </p>

        {step === "choose" ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep("ai-input")}
                className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-4 text-left transition hover:border-sky-400/45 hover:bg-slate-1000/[0.14]"
              >
                <span className="text-sm font-semibold text-slate-100">Use AI</span>
                <span className="mt-1 block text-[11px] text-wf-muted">
                  Background + optional sample slides (review before adding)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStep("manual")}
                className="rounded-xl border border-white/[0.12] bg-wf-bg/40 px-4 py-4 text-left transition hover:border-white/[0.2] hover:bg-wf-bg/55"
              >
                <span className="text-sm font-semibold text-wf-text">Blank slide</span>
                <span className="mt-1 block text-[11px] text-wf-muted">
                  One empty slide — style it in the editor (fonts, backgrounds)
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

        {step === "ai-input" ? (
          <>
            <label className="mt-4 block">
              <span className="text-[10px] text-wf-muted">Hint for AI (optional)</span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. opening prayer, baptism moment, welcome newcomers…"
                className="mt-0.5 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 py-2 text-sm"
              />
            </label>
            <fieldset className="mt-4 space-y-2">
              <legend className="text-[10px] font-medium text-wf-muted">Slide text</legend>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/[0.06] bg-wf-bg/30 p-3">
                <input
                  type="radio"
                  name="wf-content-mode"
                  checked={contentMode === "user_text"}
                  onChange={() => setContentMode("user_text")}
                  className="mt-1"
                />
                <span>
                  <span className="text-sm font-medium text-wf-text">I’ll type the words</span>
                  <span className="mt-0.5 block text-[11px] text-wf-muted">
                    AI only chooses background; you edit lines after generate
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/[0.06] bg-wf-bg/30 p-3">
                <input
                  type="radio"
                  name="wf-content-mode"
                  checked={contentMode === "ai_text"}
                  onChange={() => setContentMode("ai_text")}
                  className="mt-1"
                />
                <span>
                  <span className="text-sm font-medium text-wf-text">Generate sample text</span>
                  <span className="mt-0.5 block text-[11px] text-wf-muted">
                    Dummy lines for layout — replace before Sunday
                  </span>
                </span>
              </label>
            </fieldset>
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
                disabled={aiLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {aiLoading ? "Generating…" : "Generate"}
              </button>
            </div>
          </>
        ) : null}

        {step === "ai-review" ? (
          <>
            {aiNote ? (
              <p className="mt-3 rounded-lg border border-white/[0.06] bg-wf-bg/30 px-3 py-2 text-[11px] text-wf-muted">
                {aiNote}
              </p>
            ) : null}
            <label className="mt-3 block">
              <span className="text-[10px] text-wf-muted">Setlist row label</span>
              <input
                value={rowLabel}
                onChange={(e) => setRowLabel(e.target.value)}
                className="mt-0.5 h-9 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 text-sm"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-[10px] text-wf-muted">Font style for this block</span>
              <select
                value={itemTypography}
                onChange={(e) => setItemTypography(e.target.value as SlideTypography)}
                className="mt-0.5 h-9 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-2 text-sm"
              >
                <option value="editorial">Editorial (lighter, large)</option>
                <option value="default">Bold (default weight)</option>
              </select>
            </label>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-wf-muted">
              Review slides
            </p>
            <div className="mt-2 space-y-3">
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
                onClick={() => setStep("ai-input")}
                className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-wf-muted"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-wf-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAiAdd}
                disabled={!reviewSlides.length}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Add to setlist
              </button>
            </div>
          </>
        ) : null}

        {step === "manual" ? (
          <>
            <label className="mt-4 block">
              <span className="text-[10px] text-wf-muted">Row label</span>
              <input
                value={rowLabel}
                onChange={(e) => setRowLabel(e.target.value)}
                className="mt-0.5 h-10 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 text-sm"
              />
            </label>
            <p className="mt-2 text-[11px] text-wf-muted">
              Use the block editor below to set background, fonts, and slide text.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-wf-muted"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-wf-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmManualAdd}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Add to setlist
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
