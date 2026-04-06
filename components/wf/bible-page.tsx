"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BIBLE_TRANSLATION_LABELS,
  BIBLE_TRANSLATION_ORDER,
  lookupScripture,
  type BibleTranslationKey,
} from "@/lib/bible-lookup";
import type { VerseSuggestion } from "@/lib/bible-topic-suggestions";
import { scriptureToSlideCards } from "@/lib/slide-engine";
import { SlideStage } from "@/components/wf/slide-stage";

export function BiblePage() {
  const [query, setQuery] = useState("John 3:16");
  const [translation, setTranslation] = useState<BibleTranslationKey>("NIV");
  const [topicForAi, setTopicForAi] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<VerseSuggestion[] | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [passageOverride, setPassageOverride] = useState<{ ref: string; text: string } | null>(
    null,
  );
  const preservePassageOverrideRef = useRef(false);

  const lookupResult = useMemo(
    () => lookupScripture(query, translation),
    [query, translation],
  );

  useEffect(() => {
    if (preservePassageOverrideRef.current) {
      preservePassageOverrideRef.current = false;
      return;
    }
    setPassageOverride(null);
    setAiSuggestions(null);
    setAiNote(null);
    setAiError(null);
  }, [query, translation]);

  const result = passageOverride ?? lookupResult;

  const scriptureSlides = useMemo(
    () => scriptureToSlideCards(result.ref, result.text),
    [result.ref, result.text],
  );

  const fetchAiSuggestions = useCallback(async () => {
    const topic = topicForAi.trim() || query.trim();
    if (!topic) {
      setAiError("Type a topic or theme first.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions(null);
    setAiNote(null);
    try {
      const res = await fetch("/api/bible/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, translation }),
      });
      const data = (await res.json()) as {
        suggestions?: VerseSuggestion[];
        note?: string;
        error?: string;
      };
      if (!res.ok) {
        setAiError(data.error ?? "Could not load suggestions.");
        return;
      }
      setAiSuggestions(data.suggestions ?? []);
      setAiNote(data.note ?? null);
    } catch {
      setAiError("Network error — try again.");
    } finally {
      setAiLoading(false);
    }
  }, [topicForAi, query, translation]);

  const applySuggestion = useCallback((s: VerseSuggestion) => {
    preservePassageOverrideRef.current = true;
    setPassageOverride({ ref: s.ref, text: s.text });
    setQuery(s.ref);
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Bible</h1>
        <p className="mt-1 text-sm text-wf-muted">
          Look up a reference, or ask for AI-matched verses on a theme — each option shows the text.
        </p>
      </div>

      <div className="rounded-[18px] border border-white/[0.08] bg-wf-card/50 p-4 backdrop-blur-xl">
        <label htmlFor="bible-search" className="sr-only">
          Bible search
        </label>
        <input
          id="bible-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="John 3:16 or Romans 8"
          className="h-12 w-full rounded-[14px] border border-white/[0.08] bg-wf-bg/60 px-4 text-sm outline-none focus:ring-2 focus:ring-violet-500/25"
        />
        <label htmlFor="bible-translation" className="mt-3 block">
          <span className="text-[11px] font-medium uppercase tracking-wider text-wf-muted">
            Translation
          </span>
          <select
            id="bible-translation"
            value={translation}
            onChange={(e) => setTranslation(e.target.value as BibleTranslationKey)}
            className="mt-1.5 h-10 w-full max-w-md rounded-[12px] border border-white/[0.08] bg-wf-bg/60 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/25"
          >
            {BIBLE_TRANSLATION_ORDER.map((t) => (
              <option key={t} value={t}>
                {t} — {BIBLE_TRANSLATION_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <label htmlFor="bible-topic-ai" className="text-[11px] font-semibold uppercase tracking-wider text-violet-200/90">
            Topic for AI verse ideas
          </label>
          <p className="mt-1 text-[11px] leading-snug text-wf-muted">
            Describe what you are looking for (e.g. &quot;comfort after loss&quot;, &quot;verses on
            patience&quot;). If you leave this empty, your reference search above is used as the topic.
          </p>
          <textarea
            id="bible-topic-ai"
            data-wf-tour="tour-bible-ai"
            value={topicForAi}
            onChange={(e) => setTopicForAi(e.target.value)}
            placeholder="e.g. peace when I feel anxious, hope in grief, verses on patience"
            rows={2}
            className="mt-2 w-full resize-y rounded-[14px] border border-white/[0.08] bg-wf-bg/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/25"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchAiSuggestions()}
              disabled={aiLoading}
              aria-busy={aiLoading}
              className="rounded-[12px] bg-gradient-to-r from-violet-600/90 to-indigo-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 disabled:opacity-50"
            >
              {aiLoading ? "Finding verses…" : "Get AI verse options"}
            </button>
            {aiSuggestions?.length ? (
              <button
                type="button"
                onClick={() => {
                  setAiSuggestions(null);
                  setAiNote(null);
                }}
                className="rounded-[12px] border border-white/[0.1] px-4 py-2.5 text-sm text-wf-muted hover:text-wf-text"
              >
                Hide options
              </button>
            ) : null}
          </div>
          {aiError ? <p className="mt-2 text-sm text-red-300/90">{aiError}</p> : null}
          {aiNote ? <p className="mt-2 text-[11px] text-wf-muted">{aiNote}</p> : null}
        </div>
      </div>

      {aiSuggestions && aiSuggestions.length > 0 ? (
        <section className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-wf-muted">
            Suggested verses (tap one to use in preview)
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {aiSuggestions.map((s, idx) => (
              <li key={`${s.ref}-${idx}`}>
                <button
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="flex h-full w-full flex-col rounded-[16px] border border-white/[0.08] bg-wf-card/40 p-4 text-left backdrop-blur-md transition hover:border-violet-500/35 hover:bg-violet-500/[0.06]"
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-violet-200/90">
                    {s.ref}
                  </span>
                  <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-wf-text">{s.text}</p>
                  <p className="mt-3 text-[11px] leading-snug text-wf-muted">{s.blurb}</p>
                  <span className="mt-3 text-[11px] font-semibold text-violet-300/90">
                    Use this verse →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <article className="mt-8 rounded-[20px] border border-white/[0.06] bg-wf-card/40 p-8 backdrop-blur-md transition hover:border-violet-500/15">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-wf-muted">
          {result.ref}
        </p>
        {passageOverride ? (
          <p className="mt-2 text-center text-[11px] text-violet-300/90">
            Showing a verse you chose from AI options (change the reference above to reset).
          </p>
        ) : null}
        <p className="mt-6 text-balance text-center text-xl font-medium leading-relaxed text-wf-text md:text-2xl">
          {result.text}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="rounded-[12px] bg-gradient-to-r from-blue-600/90 to-violet-600/90 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/20"
          >
            Add to presentation
          </button>
          <Link
            href="/ai"
            className="rounded-[12px] border border-white/[0.1] px-5 py-2.5 text-sm font-medium text-wf-text hover:border-violet-500/30"
          >
            Open in AI Assistant
          </Link>
        </div>
      </article>

      <section className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-wf-muted">
          Slide preview (2–4 lines each)
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {scriptureSlides.map((s, idx) => (
            <div key={idx} className="w-[min(280px,85vw)] shrink-0">
              <SlideStage
                title={s.title}
                lines={s.lines}
                motion
                typography="editorial"
                className="min-h-[200px]"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 rounded-[16px] border border-white/[0.06] bg-wf-card/30 p-5">
        <p className="text-sm font-semibold text-wf-text">Tip</p>
        <p className="mt-2 text-sm leading-relaxed text-wf-muted">
          Use <strong className="font-medium text-wf-text">Get AI verse options</strong> when you
          have a theme in mind but not a chapter and verse. After you pick an option, the main
          preview and slides update; editing the reference field clears the selection.
        </p>
      </div>
    </div>
  );
}
