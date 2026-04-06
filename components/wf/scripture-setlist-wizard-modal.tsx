"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BIBLE_TRANSLATION_LABELS,
  BIBLE_TRANSLATION_ORDER,
  type BibleTranslationKey,
} from "@/lib/bible-lookup";
import {
  fetchScriptureSetlistAi,
  type ScriptureSetlistAiMultiPayload,
  type ScriptureSetlistAiPayload,
  type ScriptureSetlistAiOption,
} from "@/lib/fetch-scripture-setlist-ai";
import type { DeckSlide } from "@/lib/setlists-catalog";

type Step = "choose" | "ai-input" | "ai-pick" | "ai-review" | "manual";

type ReviewSlide = { title: string; lines: string[] };

function isMultiPayload(
  p: ScriptureSetlistAiPayload | ScriptureSetlistAiMultiPayload,
): p is ScriptureSetlistAiMultiPayload {
  return "options" in p;
}

export function ScriptureSetlistWizardModal(props: {
  open: boolean;
  onClose: () => void;
  /** Adds a scripture row with these slides; parent supplies setlist item id. */
  onAddScripture: (payload: { name: string; slides: DeckSlide[] }) => void;
}) {
  const { open, onClose, onAddScripture } = props;

  const [step, setStep] = useState<Step>("choose");
  const [query, setQuery] = useState("");
  const [translation, setTranslation] = useState<BibleTranslationKey>("NIV");
  const [rowLabel, setRowLabel] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [reviewSlides, setReviewSlides] = useState<ReviewSlide[]>([]);
  const [aiNote, setAiNote] = useState("");
  /** Canonical passage ref from AI (footer on audience). */
  const [aiPassageRef, setAiPassageRef] = useState("");
  const [aiOptions, setAiOptions] = useState<ScriptureSetlistAiOption[] | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("choose");
      setQuery("");
      setTranslation("NIV");
      setRowLabel("");
      setAiLoading(false);
      setReviewSlides([]);
      setAiNote("");
      setAiPassageRef("");
      setAiOptions(null);
    }
  }, [open]);

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
    setReviewSlides((s) => [...s, { title: rowLabel.trim() || "Slide", lines: [""] }]);
  }, [rowLabel]);

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
    if (!query.trim()) return;
    setAiLoading(true);
    try {
      const outcome = await fetchScriptureSetlistAi(query.trim(), translation);
      if (outcome.ok) {
        const payload = outcome.data;
        if (isMultiPayload(payload)) {
          const options = payload.options ?? [];
          setAiOptions(options);
          setAiNote(payload.note ?? "");
          if (options.length === 0) {
            setStep("ai-input");
          } else {
            setStep("ai-pick");
          }
          return;
        }
        setAiOptions(null);
        setReviewSlides(payload.slides.map((s) => ({ title: s.title, lines: [...s.lines] })));
        setRowLabel(payload.ref);
        setAiPassageRef(payload.ref);
        setAiNote(payload.note ?? "");
        setStep("ai-review");
      } else {
        setReviewSlides([
          {
            title: "Scripture · Slide 1",
            lines: ["(AI could not run)", outcome.error],
          },
        ]);
        setRowLabel("Scripture");
        setAiPassageRef("");
        setAiOptions(null);
        setAiNote(outcome.error);
        setStep("ai-review");
      }
    } finally {
      setAiLoading(false);
    }
  }, [query, translation]);

  const pickAiOption = useCallback((opt: ScriptureSetlistAiOption) => {
    setAiOptions(null);
    setReviewSlides(opt.slides.map((s) => ({ title: s.title, lines: [...s.lines] })));
    setRowLabel(opt.ref);
    setAiPassageRef(opt.ref);
    setStep("ai-review");
  }, []);

  const confirmAiAdd = useCallback(() => {
    const name = rowLabel.trim() || "Scripture";
    const citation = aiPassageRef.trim();
    const slides: DeckSlide[] = reviewSlides.map((s) => {
      const lines = s.lines.map((l) => l.trimEnd()).filter((l) => l.length > 0);
      const base: DeckSlide = { title: s.title, lines: lines.length ? lines : [""] };
      if (citation) base.audienceCitation = citation;
      return base;
    });
    if (slides.length === 0) return;
    onAddScripture({ name, slides });
  }, [aiPassageRef, onAddScripture, reviewSlides, rowLabel]);

  const confirmManualAdd = useCallback(() => {
    onAddScripture({
      name: rowLabel.trim() || "Scripture",
      slides: [{ title: "Slide 1", lines: [""] }],
    });
  }, [onAddScripture, rowLabel]);

  if (!open) return null;

  const maxW = step === "ai-review" ? "max-w-2xl" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[90vh] w-full ${maxW} overflow-y-auto rounded-[18px] border border-white/[0.1] bg-wf-card p-5 shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scripture-setlist-wizard-title"
      >
        <h2 id="scripture-setlist-wizard-title" className="text-lg font-bold text-wf-text">
          Add scripture to setlist
        </h2>
        <p className="mt-1 text-[11px] text-wf-muted">
          Dummy AI picks a passage from your prompt (reference-style or topic), splits it for projection,
          then you review. Nothing is added until you confirm.
        </p>

        {step === "choose" ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep("ai-input")}
                className="rounded-xl border border-violet-500/35 bg-violet-500/10 px-4 py-4 text-left transition hover:border-violet-400/50 hover:bg-violet-500/[0.14]"
              >
                <span className="text-sm font-semibold text-violet-100">Use AI</span>
                <span className="mt-1 block text-[11px] text-wf-muted">
                  Reference (e.g. John 3:16) or topic (e.g. hope, anxiety) → slides to review
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("manual");
                  setRowLabel("Scripture");
                }}
                className="rounded-xl border border-white/[0.12] bg-wf-bg/40 px-4 py-4 text-left transition hover:border-white/[0.2] hover:bg-wf-bg/55"
              >
                <span className="text-sm font-semibold text-wf-text">Blank slides</span>
                <span className="mt-1 block text-[11px] text-wf-muted">
                  One empty slide — type your own text in the setlist row
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
              <span className="text-[10px] text-wf-muted">Reference or topic</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='e.g. "Romans 8:28" or "peace when anxious"'
                className="mt-0.5 h-10 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-3 text-sm"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-[10px] text-wf-muted">Sample translation (stub)</span>
              <select
                value={translation}
                onChange={(e) => setTranslation(e.target.value as BibleTranslationKey)}
                className="mt-0.5 h-9 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-2 text-sm"
              >
                {BIBLE_TRANSLATION_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {k} — {BIBLE_TRANSLATION_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
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
                disabled={!query.trim() || aiLoading}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {aiLoading ? "Generating slides…" : "Generate slides"}
              </button>
            </div>
            {aiNote ? (
              <p className="mt-3 rounded-lg border border-white/[0.06] bg-wf-bg/30 px-3 py-2 text-[11px] text-wf-muted">
                {aiNote}
              </p>
            ) : null}
          </>
        ) : null}

        {step === "ai-pick" ? (
          <>
            {aiNote ? (
              <p className="mt-3 rounded-lg border border-white/[0.06] bg-wf-bg/30 px-3 py-2 text-[11px] text-wf-muted">
                {aiNote}
              </p>
            ) : null}
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-wf-muted">
              Pick a passage
            </p>
            <div className="mt-2 space-y-2">
              {(aiOptions ?? []).map((o) => (
                <button
                  key={o.ref}
                  type="button"
                  onClick={() => pickAiOption(o)}
                  className="w-full rounded-xl border border-white/[0.08] bg-wf-bg/40 px-4 py-3 text-left transition hover:border-violet-400/40 hover:bg-violet-500/10"
                >
                  <p className="text-sm font-semibold text-wf-text">{o.ref}</p>
                  {o.blurb ? (
                    <p className="mt-1 text-[11px] text-wf-muted">{o.blurb}</p>
                  ) : null}
                </button>
              ))}
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
                placeholder="Shown in the order of service"
              />
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
                className="text-[11px] font-medium text-violet-300 hover:text-violet-200"
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
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
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
              You’ll get one empty slide below; expand the row to edit text.
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
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
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
