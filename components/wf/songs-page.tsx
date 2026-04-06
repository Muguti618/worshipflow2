"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { useAutosave } from "@/hooks/use-autosave";
import { useAllSongs } from "@/hooks/use-all-songs";
import { SlideBackgroundRow } from "@/components/wf/slide-background-row";
import type { DeckSlide } from "@/lib/setlists-catalog";
import type { LibrarySong } from "@/lib/songs-catalog";
import { removeUserSong, updateUserSong } from "@/lib/user-songs-storage";
import { BackgroundUploadControl } from "@/components/wf/background-upload-control";
import { NewSongWizardModal } from "@/components/wf/new-song-wizard-modal";
import { BACKGROUND_PRESETS, BACKGROUND_SOLID_SWATCHES } from "@/lib/background-presets";
import {
  FREE_BACKGROUND_PRESET_IDS,
  FREE_MAX_SONGS,
  FREE_SOLID_SWATCH_COUNT,
  FREE_TIER_SLIDE_BRANDING,
} from "@/lib/plan-limits";
import { isDataUrlImage } from "@/lib/read-image-data-url";
import { SlideStage } from "@/components/wf/slide-stage";

function cloneSong(s: LibrarySong): LibrarySong {
  return JSON.parse(JSON.stringify(s)) as LibrarySong;
}

export function SongsPage({ initialSongId }: { initialSongId?: string }) {
  const { limitsApply: planLimited, ready: planReady } = usePlanEntitlements();
  const urlSong = initialSongId;
  const { songs, version } = useAllSongs();
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string>(songs[0]?.id ?? "");
  const [editDraft, setEditDraft] = useState<LibrarySong | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const songLimitBannerRef = useRef<HTMLDivElement>(null);

  const atFreeSongLimit = planReady && planLimited && songs.length >= FREE_MAX_SONGS;

  useEffect(() => {
    if (urlSong && songs.some((s) => s.id === urlSong)) {
      setActiveId(urlSong);
    }
  }, [urlSong, songs, version]);

  useEffect(() => {
    const s = songs.find((x) => x.id === activeId);
    if (s) setEditDraft(cloneSong(s));
    else setEditDraft(null);
  }, [activeId, songs, version]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    if (!qn) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(qn) ||
        s.tags.some((t) => t.toLowerCase().includes(qn)),
    );
  }, [q, songs]);

  useEffect(() => {
    if (!filtered.some((s) => s.id === activeId) && filtered[0]) {
      setActiveId(filtered[0].id);
    }
  }, [filtered, activeId]);

  const active = songs.find((s) => s.id === activeId) ?? songs[0];

  const persistSong = useCallback((s: LibrarySong) => {
    updateUserSong(s);
  }, []);

  const { autosaveNote, markSaved } = useAutosave({
    data: editDraft,
    enabled: Boolean(active && editDraft),
    canSave: Boolean(editDraft && active && editDraft.id === active.id),
    save: persistSong,
  });

  const saveEdits = useCallback(() => {
    if (!editDraft) return;
    updateUserSong(editDraft);
    markSaved();
  }, [editDraft, markSaved]);

  const openNewSongModal = useCallback(() => {
    if (planReady && planLimited && songs.length >= FREE_MAX_SONGS) {
      songLimitBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setNewOpen(true);
  }, [planLimited, planReady, songs.length]);

  const deleteSong = useCallback(() => {
    if (!active) return;
    if (!confirm(`Delete “${active.title}” from your library?`)) return;
    removeUserSong(active.id);
    setActiveId(songs.find((s) => s.id !== active.id)?.id ?? songs[0]?.id ?? "");
  }, [active, songs]);

  const updateSlide = (si: number, field: "title" | "lines", value: string | string[]) => {
    setEditDraft((d) => {
      if (!d) return d;
      const slides = [...d.slides];
      const sl = { ...slides[si]! };
      if (field === "title") sl.title = value as string;
      else sl.lines = value as string[];
      slides[si] = sl;
      return { ...d, slides };
    });
  };

  const patchSlide = useCallback((si: number, patch: Partial<DeckSlide>) => {
    setEditDraft((d) => {
      if (!d) return d;
      const slides = [...d.slides];
      const prev = slides[si]!;
      const merged: DeckSlide = { ...prev, ...patch };
      if (patch.backgroundUrl === undefined && "backgroundUrl" in patch) {
        delete merged.backgroundUrl;
      }
      if (patch.backgroundColor === undefined && "backgroundColor" in patch) {
        delete merged.backgroundColor;
      }
      if (patch.backgroundFullBleed === undefined && "backgroundFullBleed" in patch) {
        delete merged.backgroundFullBleed;
      }
      slides[si] = merged;
      return { ...d, slides };
    });
  }, []);

  const addSlide = () => {
    setEditDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        slides: [...d.slides, { title: `Slide ${d.slides.length + 1}`, lines: [""] }],
      };
    });
  };

  const removeSlide = (si: number) => {
    setEditDraft((d) => {
      if (!d || d.slides.length <= 1) return d;
      return { ...d, slides: d.slides.filter((_, i) => i !== si) };
    });
  };

  const moveSlide = (si: number, delta: number) => {
    setEditDraft((d) => {
      if (!d) return d;
      const j = si + delta;
      if (j < 0 || j >= d.slides.length) return d;
      const slides = [...d.slides];
      const tmp = slides[si]!;
      slides[si] = slides[j]!;
      slides[j] = tmp;
      return { ...d, slides };
    });
  };

  const previewSlide = useMemo(() => {
    if (!editDraft) {
      return { title: "", lines: [""] };
    }
    return editDraft.slides[0] ?? { title: editDraft.title, lines: [""] };
  }, [editDraft]);

  const songBgPresetList = useMemo(() => {
    if (!planLimited) return BACKGROUND_PRESETS;
    const ids = new Set<string>(FREE_BACKGROUND_PRESET_IDS);
    return BACKGROUND_PRESETS.filter((p) => ids.has(p.id));
  }, [planLimited]);

  const songBgSolidList = useMemo(
    () =>
      planLimited
        ? BACKGROUND_SOLID_SWATCHES.slice(0, FREE_SOLID_SWATCH_COUNT)
        : [...BACKGROUND_SOLID_SWATCHES],
    [planLimited],
  );

  const previewStageBg = useMemo(() => {
    if (!editDraft) {
      return {
        backgroundUrl: undefined as string | undefined,
        backgroundColor: undefined as string | undefined,
        backgroundFullBleed: undefined as boolean | undefined,
      };
    }
    const sl = editDraft.slides[0];
    if (!sl) {
      return {
        backgroundUrl: editDraft.backgroundUrl,
        backgroundColor: editDraft.backgroundColor,
        backgroundFullBleed: undefined as boolean | undefined,
      };
    }
    const slideHasOwn =
      Boolean(sl.backgroundUrl?.trim()) || Boolean(sl.backgroundColor?.trim());
    if (slideHasOwn) {
      return {
        backgroundUrl: sl.backgroundUrl,
        backgroundColor: sl.backgroundColor,
        backgroundFullBleed: sl.backgroundFullBleed,
      };
    }
    return {
      backgroundUrl: editDraft.backgroundUrl,
      backgroundColor: editDraft.backgroundColor,
      backgroundFullBleed: undefined as boolean | undefined,
    };
  }, [editDraft]);

  const newSongModal = (
    <NewSongWizardModal
      open={newOpen}
      onClose={() => setNewOpen(false)}
      onSongCreated={(song) => {
        setActiveId(song.id);
        setNewOpen(false);
      }}
    />
  );

  if (!active || !editDraft) {
    return (
      <>
        <div className="p-8 text-sm text-wf-muted">
          No songs yet.{" "}
          <button type="button" onClick={() => void openNewSongModal()} className="text-sky-400 underline">
            Add one
          </button>
          .
        </div>
        {newSongModal}
      </>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {atFreeSongLimit ? (
        <div
          ref={songLimitBannerRef}
          className="shrink-0 border-b border-amber-500/35 bg-gradient-to-br from-amber-500/[0.18] via-orange-600/[0.12] to-blue-700/[0.14] px-4 py-6 shadow-lg shadow-black/20 sm:px-6 sm:py-8"
          role="region"
          aria-label="Song library limit"
        >
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-100/90">
                Free plan · song limit reached
              </p>
              <p className="text-xl font-bold tracking-tight text-wf-text sm:text-2xl">
                You&apos;re using all {FREE_MAX_SONGS} songs
              </p>
              <p className="max-w-xl text-sm leading-relaxed text-amber-50/85">
                Upgrade to Pro for an unlimited library, full backgrounds, remote control, and AI—keep every
                service in one place.
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
              <Link
                href="/upgrade"
                className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-[14px] bg-gradient-to-r from-amber-400 to-orange-500 px-8 text-sm font-bold text-amber-950 shadow-lg shadow-amber-950/30 transition hover:brightness-110"
              >
                Upgrade to Pro
              </Link>
              <p className="text-center text-[11px] text-amber-100/60 sm:text-right">
                Secure checkout with Stripe
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex w-full flex-col border-b border-white/[0.06] lg:w-[340px] lg:border-b-0 lg:border-r">
        <div className="border-b border-white/[0.06] p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold tracking-tight">Songs</h1>
            <button
              type="button"
              onClick={() => void openNewSongModal()}
              title={atFreeSongLimit ? "Song limit reached — upgrade for more" : "Add a new song"}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                atFreeSongLimit
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-100/90 hover:bg-amber-500/15"
                  : "border-white/15 bg-white/[0.04] text-sky-200"
              }`}
            >
              + New
            </button>
          </div>
          <p className="mt-0.5 text-xs text-wf-muted">
            Each song = <strong className="font-medium text-wf-text">many slides</strong> (verse, chorus,
            …). Per-slide backgrounds and uploads live under each slide. Used in setlists.{" "}
            <Link href="/tutorial" className="text-sky-400 hover:underline">
              Tutorial
            </Link>
          </p>
          <input
            type="search"
            data-wf-tour="tour-songs-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search songs or tags…"
            className="mt-3 h-10 w-full rounded-[12px] border border-white/[0.08] bg-wf-card/80 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/25"
            aria-label="Search songs"
          />
        </div>
        <ul className="flex-1 overflow-auto p-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`mb-1 w-full rounded-[14px] border px-3 py-3 text-left transition ${
                  s.id === activeId
                    ? "border-white/15 bg-white/[0.08]"
                    : "border-transparent hover:bg-white/[0.04]"
                }`}
              >
                <p className="font-semibold text-wf-text">{s.title}</p>
                <p className="mt-0.5 text-[11px] text-wf-muted">{s.structure}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-200/90"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{editDraft.title}</h2>
            <p className="text-xs text-wf-muted">{editDraft.structure}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveEdits}
              className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-blue-600 hover:bg-blue-500 px-4 text-sm font-semibold text-white"
            >
              Save changes
            </button>
            {autosaveNote ? (
              <span className="text-xs text-wf-muted" aria-live="polite">
                {autosaveNote}
              </span>
            ) : null}
            <button
              type="button"
              onClick={deleteSong}
              className="h-10 rounded-[12px] border border-red-500/25 px-4 text-sm text-red-300/90 hover:bg-red-500/10"
            >
              Delete
            </button>
            <Link
              href="/present?room=default"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/[0.1] px-4 text-sm font-medium text-wf-muted hover:text-wf-text"
            >
              Presenter
            </Link>
          </div>
        </div>

        <SlideStage
          title={previewSlide.title}
          lines={previewSlide.lines}
          backgroundUrl={previewStageBg.backgroundUrl}
          backgroundColor={previewStageBg.backgroundColor}
          backgroundFullBleed={previewStageBg.backgroundFullBleed}
          motion={!previewStageBg.backgroundColor?.trim() && !previewStageBg.backgroundFullBleed}
          tierWatermark={
            planReady && planLimited ? FREE_TIER_SLIDE_BRANDING : undefined
          }
        />

        <div className="rounded-[16px] border border-white/[0.06] bg-wf-card/40 p-4 backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-wf-muted">
            Background (all slides)
          </p>
          {planLimited ? (
            <p className="mt-1 text-[10px] leading-snug text-amber-200/80">
              Free plan: core stock stills and a few colours. Upgrade for uploads, custom URLs, and the full
              preset library.
            </p>
          ) : (
            <p className="mt-1 text-[10px] leading-snug text-wf-muted">
              Used in Present and the dashboard preview. Use{" "}
              <strong className="font-medium text-wf-text">+ Yours</strong> to upload from your device (~2.5
              MB max). Solid colour overrides an image.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {songBgPresetList.map((p) => {
              const active =
                editDraft.backgroundUrl === p.url && !editDraft.backgroundColor?.trim();
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  onClick={() =>
                    setEditDraft({
                      ...editDraft,
                      backgroundUrl: p.url,
                      backgroundColor: undefined,
                    })
                  }
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
                isActive={
                  Boolean(
                    editDraft.backgroundUrl?.trim() &&
                      isDataUrlImage(editDraft.backgroundUrl) &&
                      !editDraft.backgroundColor?.trim(),
                  )
                }
                onDataUrl={(dataUrl) =>
                  setEditDraft({
                    ...editDraft,
                    backgroundUrl: dataUrl,
                    backgroundColor: undefined,
                  })
                }
              />
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-wf-muted">Colour</span>
            {songBgSolidList.map((hex) => {
              const active = editDraft.backgroundColor === hex;
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() =>
                    setEditDraft({
                      ...editDraft,
                      backgroundColor: hex,
                      backgroundUrl: undefined,
                    })
                  }
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
                  value={editDraft.backgroundColor?.startsWith("#") ? editDraft.backgroundColor : "#1e1b4b"}
                  onChange={(e) =>
                    setEditDraft({
                      ...editDraft,
                      backgroundColor: e.target.value,
                      backgroundUrl: undefined,
                    })
                  }
                  className="h-8 w-10 cursor-pointer rounded border border-white/15 bg-transparent"
                />
              </label>
            ) : null}
          </div>
          {!planLimited ? (
            <label className="mt-3 block">
              <span className="text-[10px] text-wf-muted">Image URL (optional)</span>
              <input
                value={
                  isDataUrlImage(editDraft.backgroundUrl) ? "" : (editDraft.backgroundUrl ?? "")
                }
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setEditDraft({
                    ...editDraft,
                    backgroundUrl: v || undefined,
                    backgroundColor: v ? undefined : editDraft.backgroundColor,
                  });
                }}
                placeholder="https://… or use Upload from device above"
                className="mt-0.5 h-9 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-2 font-mono text-xs"
              />
            </label>
          ) : null}
          {isDataUrlImage(editDraft.backgroundUrl) ? (
            <p className="mt-1 text-[10px] text-wf-muted">
              Using your uploaded image. Clear URL field is normal — the file is stored with the song.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() =>
              setEditDraft({
                ...editDraft,
                backgroundUrl: undefined,
                backgroundColor: undefined,
              })
            }
            className="mt-2 text-[11px] font-medium text-wf-muted hover:text-wf-text"
          >
            Reset to app default
          </button>
        </div>

        <div className="rounded-[16px] border border-white/[0.06] bg-wf-card/40 p-4 backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-wf-muted">Slides</p>
          <label className="mt-3 block">
            <span className="text-[10px] text-wf-muted">Title</span>
            <input
              value={editDraft.title}
              onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
              className="mt-0.5 h-9 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-2 text-sm"
            />
          </label>
          <div className="mt-4 space-y-4">
            {editDraft.slides.map((slide, si) => (
              <div key={si} className="rounded-xl border border-white/[0.06] bg-wf-bg/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] tabular-nums text-wf-muted">#{si + 1}</span>
                  <input
                    value={slide.title}
                    onChange={(e) => updateSlide(si, "title", e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-white/[0.06] bg-transparent px-2 py-1 text-xs font-medium"
                  />
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSlide(si, -1)}
                      disabled={si === 0}
                      className="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-wf-muted hover:bg-white/[0.06] disabled:opacity-25"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(si, 1)}
                      disabled={si >= editDraft.slides.length - 1}
                      className="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-wf-muted hover:bg-white/[0.06] disabled:opacity-25"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(si)}
                      disabled={editDraft.slides.length <= 1}
                      className="text-[11px] text-wf-muted hover:text-red-300 disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <textarea
                  value={slide.lines.join("\n")}
                  onChange={(e) =>
                    updateSlide(si, "lines", e.target.value.split(/\r?\n/))
                  }
                  rows={Math.min(10, Math.max(3, slide.lines.length + 2))}
                  className="mt-2 w-full resize-y rounded-lg border border-white/[0.06] bg-wf-bg/40 px-2 py-2 font-mono text-xs"
                />
                <div className="mt-3 rounded-lg border border-white/[0.05] bg-wf-bg/20 p-2">
                  <SlideBackgroundRow
                    slide={slide}
                    presetLimit={BACKGROUND_PRESETS.length}
                    planLimited={planLimited}
                    onPatch={(patch) => patchSlide(si, patch)}
                    resetButton={{
                      label: "Use song default",
                      onClick: () =>
                        patchSlide(si, {
                          backgroundUrl: undefined,
                          backgroundColor: undefined,
                          backgroundFullBleed: undefined,
                        }),
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addSlide}
              className="text-[11px] font-medium text-sky-400 hover:text-sky-200"
            >
              + Add slide
            </button>
          </div>
        </div>
      </div>
      </div>

      {newSongModal}
    </div>
  );
}
