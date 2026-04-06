"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { lyricsToSlideCards } from "@/lib/slide-engine";

const SAMPLE = `[Verse 1]
Amazing grace how sweet the sound
That saved a wretch like me
I once was lost but now I'm found
Was blind but now I see

[Chorus]
My chains are gone, I've been set free
My God, my Savior has ransomed me`;

export function PublicLyricSplitter() {
  const [raw, setRaw] = useState(SAMPLE);
  const [maxLines, setMaxLines] = useState(3);
  const [copied, setCopied] = useState(false);

  const cards = useMemo(() => lyricsToSlideCards(raw, maxLines), [raw, maxLines]);

  const plainExport = useMemo(() => {
    return cards
      .map((c, i) => {
        const head = c.title ? `${c.title} — slide ${i + 1}` : `Slide ${i + 1}`;
        return `${head}\n${c.lines.join("\n")}`;
      })
      .join("\n\n—\n\n");
  }, [cards]);

  const copyPlain = async () => {
    try {
      await navigator.clipboard.writeText(plainExport);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-[22px] border border-white/[0.1] bg-gradient-to-b from-slate-500/[0.06] to-wf-card/60 p-5 shadow-xl shadow-black/35 backdrop-blur-md sm:p-8">
      <div className="text-center">
        <h2
          id="lyric-splitter-heading"
          className="text-2xl font-bold tracking-tight text-wf-text sm:text-[1.65rem]"
        >
          Try the AI Lyric Splitter — no sign-up needed
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-wf-muted">
          Paste lyrics and get readable, projection-ready slides in seconds. Section markers like{" "}
          <span className="font-mono text-[0.85em] text-sky-200/90">[Chorus]</span> and blank lines between
          blocks are understood—everything runs in your browser (no account, no upload).
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-[11px] leading-relaxed text-wf-muted/75">
          This uses the same smart, section-aware engine as LumenWorship&apos;s preview. Optional
          cloud-based layout refinement lives in the app for Pro users with an OpenAI key—start here free,
          then sign up when you want setlists and Present.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex min-h-0 flex-col">
          <label htmlFor="public-lyrics" className="text-xs font-semibold uppercase tracking-wider text-wf-muted">
            Your lyrics
          </label>
          <textarea
            id="public-lyrics"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={12}
            placeholder="Paste lyrics here…"
            className="mt-2 min-h-[220px] flex-1 resize-y rounded-[14px] border border-wf-border bg-wf-bg/80 px-4 py-3 text-sm leading-relaxed text-wf-text outline-none ring-sky-500/0 transition focus:border-sky-500/35 focus:ring-2 focus:ring-sky-500/20"
          />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-wf-muted">
              <span>Max lines per slide</span>
              <select
                value={maxLines}
                onChange={(e) => setMaxLines(Number(e.target.value))}
                className="rounded-lg border border-wf-border bg-wf-card px-2 py-1.5 text-xs text-wf-text outline-none focus:border-sky-500/35"
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void copyPlain()}
              className="rounded-[10px] border border-wf-border bg-wf-card/80 px-4 py-2 text-xs font-semibold text-wf-text transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              {copied ? "Copied" : "Copy slides as text"}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <p className="text-xs font-semibold uppercase tracking-wider text-wf-muted">Slide preview</p>
          <div className="mt-2 max-h-[min(420px,55vh)] space-y-3 overflow-y-auto rounded-[14px] border border-wf-border/80 bg-black/25 p-3 sm:p-4">
            {cards.length === 0 ? (
              <p className="py-8 text-center text-sm text-wf-muted">Paste lyrics to see slides.</p>
            ) : (
              cards.map((c, idx) => (
                <div
                  key={`${idx}-${c.title}-${c.lines[0]?.slice(0, 8)}`}
                  className="rounded-xl border border-white/[0.08] bg-wf-card/40 p-4 text-left shadow-inner shadow-black/20"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sky-200/85">
                    {c.title} · {idx + 1}/{cards.length}
                  </p>
                  <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-wf-text">
                    {c.lines.map((line, li) => (
                      <p key={li}>{line}</p>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 border-t border-wf-border/60 pt-8 sm:flex-row sm:gap-4">
        <p className="text-center text-sm text-wf-muted">
          Love it? Save songs, build setlists, and present with Audience view.
        </p>
        <Link
          href="/register"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-[12px] bg-blue-600 hover:bg-blue-500 px-6 text-sm font-bold text-white shadow-lg shadow-black/35 transition hover:brightness-110"
        >
          Create a free account
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-sky-400/90 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
