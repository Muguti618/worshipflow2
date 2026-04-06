"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BIBLE_TRANSLATION_LABELS,
  BIBLE_TRANSLATION_ORDER,
  lookupScripture,
  looksLikeVerseReference,
  type BibleTranslationKey,
} from "@/lib/bible-lookup";
import { suggestVersesForTopic, type VerseSuggestion } from "@/lib/bible-topic-suggestions";
import type { DeckSlide } from "@/lib/setlists-catalog";
import type { LibrarySong } from "@/lib/songs-catalog";
import {
  lyricsToSlideCards,
  scriptureToSlideCards,
  withLeadingSongTitleSlide,
} from "@/lib/slide-engine";
import { FREE_MAX_VERSE_BEAMS } from "@/lib/plan-limits";
import {
  incrementVerseBeamUsage,
  readVerseBeamUsageCount,
  verseBeamsRemaining,
} from "@/lib/verse-beam-usage";
import { readUserSongs, USER_SONGS_CHANNEL } from "@/lib/user-songs-storage";

export type QuickBeamTab = "scripture" | "song";

function cloneDeckSlides(slides: DeckSlide[]): DeckSlide[] {
  return slides.map((s) => ({ ...s, lines: [...s.lines] }));
}

type Props = {
  open: boolean;
  onClose: () => void;
  publishBeam: (beam: { slides: DeckSlide[]; index: number }) => Promise<boolean>;
  limitsApply: boolean;
};

export function QuickBeamModal({ open, onClose, publishBeam, limitsApply }: Props) {
  const [tab, setTab] = useState<QuickBeamTab>("scripture");

  const [qvQuery, setQvQuery] = useState("John 3:16");
  const [qvTranslation, setQvTranslation] = useState<BibleTranslationKey>("NIV");
  const [qvPick, setQvPick] = useState<VerseSuggestion | null>(null);
  const [qvSuggestions, setQvSuggestions] = useState<VerseSuggestion[] | null>(null);
  const [qvAiLoading, setQvAiLoading] = useState(false);
  const [qvAiError, setQvAiError] = useState<string | null>(null);
  const [qvAiNote, setQvAiNote] = useState<string | null>(null);

  const [songLibrary, setSongLibrary] = useState<LibrarySong[]>([]);
  const [songSearch, setSongSearch] = useState("");
  const [songPick, setSongPick] = useState<LibrarySong | null>(null);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteLyrics, setPasteLyrics] = useState("");
  const [songLinesPerSlide, setSongLinesPerSlide] = useState(3);

  const beamsUsed = limitsApply ? readVerseBeamUsageCount() : 0;

  useEffect(() => {
    if (!open) return;
    setTab("scripture");
    setSongPick(null);
    setSongSearch("");
    setQvPick(null);
    setQvSuggestions(null);
    setQvAiNote(null);
    setQvAiError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const load = () => setSongLibrary(readUserSongs());
    load();
    try {
      const ch = new BroadcastChannel(USER_SONGS_CHANNEL);
      ch.onmessage = load;
      return () => ch.close();
    } catch {
      return undefined;
    }
  }, [open]);

  const qvRefMode = useMemo(() => looksLikeVerseReference(qvQuery), [qvQuery]);
  const prevQvRefMode = useRef(qvRefMode);
  useEffect(() => {
    if (prevQvRefMode.current !== qvRefMode) {
      setQvPick(null);
      setQvSuggestions(null);
      setQvAiNote(null);
      setQvAiError(null);
    }
    prevQvRefMode.current = qvRefMode;
  }, [qvRefMode]);

  const qvLookup = useMemo(
    () => (qvRefMode ? lookupScripture(qvQuery, qvTranslation) : null),
    [qvQuery, qvTranslation, qvRefMode],
  );
  const topicCuratedSuggestions = useMemo(() => {
    if (qvRefMode || !qvQuery.trim()) return null;
    return suggestVersesForTopic(qvQuery, qvTranslation);
  }, [qvQuery, qvTranslation, qvRefMode]);

  const displaySuggestions = qvSuggestions ?? topicCuratedSuggestions;

  const qvEffective = useMemo(() => {
    if (qvRefMode) return qvPick ?? qvLookup;
    return qvPick;
  }, [qvRefMode, qvPick, qvLookup]);

  const qvSlides = useMemo(() => {
    if (!qvEffective) return [];
    return scriptureToSlideCards(qvEffective.ref, qvEffective.text);
  }, [qvEffective]);

  const filteredSongs = useMemo(() => {
    const q = songSearch.trim().toLowerCase();
    if (!q) return songLibrary;
    return songLibrary.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.structure.toLowerCase().includes(q),
    );
  }, [songLibrary, songSearch]);

  const songBeamSlides = useMemo((): DeckSlide[] => {
    if (tab !== "song") return [];
    if (songPick) {
      const raw = songPick.slides?.length ? cloneDeckSlides(songPick.slides) : [];
      if (raw.length === 0) return [];
      return withLeadingSongTitleSlide(raw, songPick.title);
    }
    const lyrics = pasteLyrics.trim();
    if (!lyrics) return [];
    const cards = lyricsToSlideCards(lyrics, songLinesPerSlide);
    const deck: DeckSlide[] = cards.map((c) => ({ title: c.title, lines: c.lines }));
    return withLeadingSongTitleSlide(deck, pasteTitle.trim() || "Spontaneous");
  }, [tab, songPick, pasteLyrics, pasteTitle, songLinesPerSlide]);

  const beamScripture = useCallback(async () => {
    if (!qvEffective) return;
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
    const synced = await publishBeam({ slides, index: 0 });
    if (!synced) {
      window.alert(
        "Could not sync to the room (server rejected the request). Check your connection and try again.",
      );
      return;
    }
    if (limitsApply) {
      incrementVerseBeamUsage();
    }
    onClose();
  }, [limitsApply, publishBeam, qvEffective, onClose]);

  const beamSong = useCallback(async () => {
    if (songBeamSlides.length === 0) return;
    const citation = songPick ? songPick.title.trim() : pasteTitle.trim() || "Spontaneous";
    const fromLibrary = Boolean(songPick);
    const slides: DeckSlide[] = songBeamSlides.map((s) => {
      if (fromLibrary) {
        return {
          ...s,
          lines: [...s.lines],
          typography: s.typography ?? "editorial",
          audienceCitation: citation,
        };
      }
      return {
        title: s.title,
        lines: [...s.lines],
        layout: s.layout,
        typography: "editorial",
        backgroundColor: "#0c0c0f",
        audienceCitation: citation,
      };
    });
    const synced = await publishBeam({ slides, index: 0 });
    if (!synced) {
      window.alert(
        "Could not sync to the room (server rejected the request). Check your connection and try again.",
      );
      return;
    }
    setSongPick(null);
    setPasteLyrics("");
    setPasteTitle("");
  }, [songBeamSlides, songPick, pasteTitle, publishBeam]);

  const fetchVerseIdeas = useCallback(async () => {
    const topic = qvQuery.trim();
    if (!topic) {
      setQvAiError("Type a topic or reference first.");
      return;
    }
    if (looksLikeVerseReference(topic)) {
      setQvAiError(
        "That looks like one reference — use the Scripture tab as-is, or type a theme for AI ideas.",
      );
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wf-quick-beam-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[min(90dvh,880px)] w-full max-w-2xl overflow-y-auto rounded-[20px] border border-white/15 bg-zinc-950 p-5 shadow-2xl shadow-black/60">
        <h2 id="wf-quick-beam-title" className="text-lg font-bold tracking-tight">
          Quick beam
        </h2>
        <p className="mt-1 text-xs text-white/50">
          Beam <strong className="font-medium text-white/65">scripture</strong> or a{" "}
          <strong className="font-medium text-white/65">whole song</strong> over the setlist — audience
          sees it immediately. After a song beam, this stays open so you can queue another.
        </p>

        <div className="mt-4 flex gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => setTab("scripture")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              tab === "scripture"
                ? "bg-white/12 text-white"
                : "text-white/45 hover:bg-white/[0.06] hover:text-white/75"
            }`}
          >
            Scripture
          </button>
          <button
            type="button"
            onClick={() => setTab("song")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              tab === "song"
                ? "bg-white/12 text-white"
                : "text-white/45 hover:bg-white/[0.06] hover:text-white/75"
            }`}
          >
            Song
          </button>
        </div>

        {tab === "scripture" ? (
          <>
            <p className="mt-4 text-xs text-white/50">
              <strong className="font-medium text-white/65">Reference</strong> (e.g. John 3:16) = one
              passage. <strong className="font-medium text-white/65">Topic</strong> = several related
              verses.
            </p>
            {limitsApply ? (
              <p className="mt-2 text-[11px] text-amber-200/85">
                Scripture beams this browser: {beamsUsed}/{FREE_MAX_VERSE_BEAMS} used ·{" "}
                {verseBeamsRemaining(beamsUsed)} left on Free (song beams are unlimited).
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
              className="mt-1 w-full resize-y rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-sky-500/30"
              placeholder='Reference: John 3:16 — Topic: peace / armor of God / comfort'
              autoComplete="off"
            />
            <p className="mt-2 text-[11px] text-sky-200/80">
              {qvRefMode
                ? "Detected: reference — preview when we have sample text."
                : qvQuery.trim()
                  ? "Detected: topic — pick a verse below (or AI on Pro)."
                  : "Type a reference or topic."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!limitsApply ? (
                <button
                  type="button"
                  onClick={() => void fetchVerseIdeas()}
                  disabled={qvAiLoading || qvRefMode}
                  aria-busy={qvAiLoading}
                  className="rounded-xl bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/30 hover:bg-slate-500 disabled:opacity-50"
                >
                  {qvAiLoading ? "Finding verses…" : "Get verse ideas (AI)"}
                </button>
              ) : (
                <p className="text-[11px] text-white/40">Topics show curated verses on Free; Pro adds AI.</p>
              )}
              {qvSuggestions && qvSuggestions.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setQvSuggestions(null);
                    setQvAiNote(null);
                  }}
                  className="rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-white/55 hover:bg-white/5"
                >
                  Hide AI suggestions
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
                className="mt-2 h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-500/35"
              >
                {BIBLE_TRANSLATION_ORDER.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900 text-white">
                    {t} — {BIBLE_TRANSLATION_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>

            {!qvRefMode && displaySuggestions && displaySuggestions.length > 0 ? (
              <div className="mt-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  {qvSuggestions?.length ? "AI suggestions" : "Related verses"} — tap to preview
                </p>
                <ul className="grid max-h-[min(40vh,320px)] gap-2 overflow-y-auto sm:grid-cols-2">
                  {displaySuggestions.map((s, idx) => (
                    <li key={`${s.ref}-${idx}-${s.text.slice(0, 12)}`}>
                      <button
                        type="button"
                        onClick={() => setQvPick(s)}
                        className={`flex h-full w-full flex-col rounded-xl border p-3 text-left text-sm transition ${
                          qvPick?.ref === s.ref && qvPick?.text === s.text
                            ? "border-amber-500/50 bg-amber-500/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/18"
                        }`}
                      >
                        <span className="text-[11px] font-bold uppercase tracking-wide text-sky-200/90">
                          {s.ref}
                        </span>
                        <p className="mt-1 line-clamp-3 text-[13px] leading-snug text-white/85">{s.text}</p>
                        <span className="mt-2 line-clamp-2 text-[11px] text-white/45">{s.blurb}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/30 p-4">
              <p className="text-center text-[11px] uppercase tracking-widest text-white/35">
                Preview
                {qvRefMode ? " — passage" : qvPick ? " — selected" : " — choose one"}
              </p>
              {qvEffective ? (
                <>
                  <p className="mt-2 text-center text-xs font-semibold text-white/70">{qvEffective.ref}</p>
                  <p className="mt-2 text-pretty text-center text-sm leading-relaxed text-white/88">
                    {qvEffective.text}
                  </p>
                </>
              ) : qvRefMode ? (
                <p className="mt-3 text-center text-sm text-white/55">
                  No built-in text for that reference. Try another (e.g. John 3:16) or use a topic.
                </p>
              ) : (
                <p className="mt-3 text-center text-sm text-white/55">
                  Tap a verse above, or switch to the Song tab for spontaneous lyrics.
                </p>
              )}
              <p className="mt-3 text-center text-[11px] text-white/40">
                {qvSlides.length} slide{qvSlides.length === 1 ? "" : "s"} on output
              </p>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void beamScripture()}
                disabled={
                  qvSlides.length === 0 ||
                  (limitsApply && readVerseBeamUsageCount() >= FREE_MAX_VERSE_BEAMS)
                }
                className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-40"
              >
                Beam scripture
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-xs text-white/50">
              Pick a <strong className="font-medium text-white/65">library song</strong> or{" "}
              <strong className="font-medium text-white/65">paste lyrics</strong> — same slide layout as
              Songs. Does not use your Free scripture-beam quota.
            </p>
            <label htmlFor="wf-song-search" className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Your library
            </label>
            <input
              id="wf-song-search"
              type="search"
              value={songSearch}
              onChange={(e) => setSongSearch(e.target.value)}
              placeholder="Search by title or tag…"
              className="mt-1 h-10 w-full rounded-xl border border-white/15 bg-black/50 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            <ul className="mt-2 max-h-[min(28vh,220px)] space-y-1 overflow-y-auto rounded-xl border border-white/[0.08] bg-black/30 p-2">
              {filteredSongs.length === 0 ? (
                <li className="px-2 py-3 text-center text-sm text-white/45">No songs match — paste below.</li>
              ) : (
                filteredSongs.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSongPick(s);
                        setPasteLyrics("");
                        setPasteTitle("");
                      }}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        songPick?.id === s.id
                          ? "border-amber-500/50 bg-amber-500/10 text-white"
                          : "border-transparent text-white/85 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="font-semibold">{s.title}</span>
                      <span className="mt-0.5 block text-[11px] text-white/45">
                        {s.slides.length} slide{s.slides.length === 1 ? "" : "s"}
                        {s.tags.length ? ` · ${s.tags.slice(0, 3).join(", ")}` : ""}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>

            <p className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Or paste lyrics (spontaneous)
            </p>
            <input
              value={pasteTitle}
              onChange={(e) => {
                setPasteTitle(e.target.value);
                setSongPick(null);
              }}
              placeholder="Song title (shown on first slide)"
              className="mt-2 h-10 w-full rounded-xl border border-white/15 bg-black/50 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[11px] text-white/55">
                Lines / slide
                <select
                  value={songLinesPerSlide}
                  onChange={(e) => {
                    setSongLinesPerSlide(Number(e.target.value));
                    setSongPick(null);
                  }}
                  className="rounded-lg border border-white/15 bg-zinc-900 px-2 py-1 text-sm text-white"
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </label>
            </div>
            <textarea
              value={pasteLyrics}
              onChange={(e) => {
                setPasteLyrics(e.target.value);
                setSongPick(null);
              }}
              rows={5}
              placeholder={"[Verse]\nLine one\nLine two\n\n[Chorus]\n…"}
              className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 font-mono text-xs leading-relaxed text-white outline-none focus:ring-2 focus:ring-sky-500/30"
            />

            <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/30 p-4">
              <p className="text-center text-[11px] uppercase tracking-widest text-white/35">
                Preview — {songBeamSlides.length} slide{songBeamSlides.length === 1 ? "" : "s"}
              </p>
              {songBeamSlides[0] ? (
                <div className="mt-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    First slide
                  </p>
                  <p className="mt-1 text-xs text-white/70">{songBeamSlides[0]!.title || "—"}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/88">
                    {songBeamSlides[0]!.lines.join("\n")}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-center text-sm text-white/55">Select a song or paste lyrics.</p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void beamSong()}
                disabled={songBeamSlides.length === 0}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-40"
              >
                Beam song
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
