"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { useAutosave } from "@/hooks/use-autosave";
import { useAllSongs } from "@/hooks/use-all-songs";
import type { CustomSetlistBlockKind } from "@/lib/ai-dummy-data";
import { SlideBackgroundRow } from "@/components/wf/slide-background-row";
import { deckSlidesFromImageFiles, MAX_IMAGE_IMPORT_SLIDES } from "@/lib/deck-slides-from-images";
import {
  type DeckSlide,
  type SetlistDefinition,
  type SetlistItem,
  type SetlistItemKind,
  type SlideTypography,
  kindLabel,
} from "@/lib/setlists-catalog";
import { getSetlistById } from "@/lib/setlists-resolve";
import { removeUserSetlist, updateUserSetlist } from "@/lib/user-setlists-storage";
import { CustomBlockSetlistWizardModal } from "@/components/wf/custom-block-setlist-wizard-modal";
import { NewSongWizardModal } from "@/components/wf/new-song-wizard-modal";
import { ScriptureSetlistWizardModal } from "@/components/wf/scripture-setlist-wizard-modal";
import { SetlistItemStylePanel } from "@/components/wf/setlist-item-style-panel";
import { resolveSlidesForItem } from "@/lib/setlist-flatten";

function cloneDef(def: SetlistDefinition): SetlistDefinition {
  return JSON.parse(JSON.stringify(def)) as SetlistDefinition;
}

const CUSTOM_BLOCK_KINDS: CustomSetlistBlockKind[] = ["prayer", "moment", "other"];

export function SetlistEditor({ setlistId }: { setlistId: string }) {
  const { limitsApply: planLimited } = usePlanEntitlements();
  const router = useRouter();
  const { songs: librarySongs, version: songsVersion } = useAllSongs();
  const [draft, setDraft] = useState<SetlistDefinition | null>(null);
  const [ready, setReady] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pickSongId, setPickSongId] = useState("");
  const [newSongOpen, setNewSongOpen] = useState(false);
  const [scriptureWizardOpen, setScriptureWizardOpen] = useState(false);
  const [customBlockOpen, setCustomBlockOpen] = useState(false);
  const [customBlockKind, setCustomBlockKind] = useState<CustomSetlistBlockKind>("prayer");

  useEffect(() => {
    const def = getSetlistById(setlistId);
    if (!def) {
      setDraft(null);
      setReady(true);
      return;
    }
    setDraft(cloneDef(def));
    setReady(true);
  }, [setlistId]);

  const writeDraft = useCallback((d: SetlistDefinition) => {
    updateUserSetlist(d);
  }, []);

  const { markSaved } = useAutosave({
    data: draft,
    enabled: ready && Boolean(draft),
    canSave: Boolean(draft && draft.id === setlistId),
    save: writeDraft,
    quiet: true,
  });

  const save = useCallback(() => {
    if (!draft) return;
    writeDraft(draft);
    markSaved();
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  }, [draft, writeDraft, markSaved]);

  const removeSetlist = useCallback(() => {
    if (!confirm("Delete this setlist permanently?")) return;
    removeUserSetlist(setlistId);
    router.push("/setlists");
  }, [router, setlistId]);

  const addSongFromLibrary = useCallback(() => {
    if (!draft || !pickSongId) return;
    const song = librarySongs.find((s) => s.id === pickSongId);
    if (!song) return;
    const slotId = `${draft.id}-slot-${Date.now()}`;
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        items: [
          ...d.items,
          {
            id: slotId,
            kind: "song" as const,
            songId: song.id,
            name: song.title,
            slides: [],
          },
        ],
      };
    });
    setPickSongId("");
  }, [draft, librarySongs, pickSongId]);

  const mergeItemStyle = (index: number, patch: Partial<SetlistItem>) => {
    setDraft((d) => {
      if (!d) return d;
      const items = [...d.items];
      const prev = items[index]!;
      const next: SetlistItem = { ...prev, ...patch };
      if ("itemBackgroundUrl" in patch && patch.itemBackgroundUrl === undefined) {
        delete next.itemBackgroundUrl;
      }
      if ("itemBackgroundColor" in patch && patch.itemBackgroundColor === undefined) {
        delete next.itemBackgroundColor;
      }
      if ("itemTypography" in patch && patch.itemTypography === undefined) {
        delete next.itemTypography;
      }
      items[index] = next;
      return { ...d, items };
    });
  };

  const setItem = (index: number, patch: Partial<SetlistItem>) => {
    setDraft((d) => {
      if (!d) return d;
      const items = [...d.items];
      items[index] = { ...items[index]!, ...patch };
      return { ...d, items };
    });
  };

  const setSlide = (itemIndex: number, slideIndex: number, patch: Partial<DeckSlide>) => {
    setDraft((d) => {
      if (!d) return d;
      const items = [...d.items];
      const item = { ...items[itemIndex]! };
      const slides = [...item.slides];
      const prev = slides[slideIndex]!;
      const merged: DeckSlide = { ...prev, ...patch };
      if (patch.typography === undefined && "typography" in patch) {
        delete merged.typography;
      }
      if (patch.backgroundUrl === undefined && "backgroundUrl" in patch) {
        delete merged.backgroundUrl;
      }
      if (patch.backgroundColor === undefined && "backgroundColor" in patch) {
        delete merged.backgroundColor;
      }
      if (patch.backgroundFullBleed === undefined && "backgroundFullBleed" in patch) {
        delete merged.backgroundFullBleed;
      }
      slides[slideIndex] = merged;
      item.slides = slides;
      items[itemIndex] = item;
      return { ...d, items };
    });
  };

  const removeItem = (index: number) => {
    setDraft((d) => (d ? { ...d, items: d.items.filter((_, i) => i !== index) } : d));
  };

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setDraft((d) => {
      if (!d) return d;
      const items = [...d.items];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved!);
      return { ...d, items };
    });
  }, []);

  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [overItemId, setOverItemId] = useState<string | null>(null);
  /** Which setlist rows show full editors (default collapsed for a shorter page). */
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(() => new Set());
  const imageImportRef = useRef<HTMLInputElement>(null);
  const [imageImportNote, setImageImportNote] = useState<string | null>(null);

  const toggleItemExpanded = useCallback((id: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const importSlidesFromImages = useCallback(
    async (files: File[]) => {
      if (!draft || files.length === 0) return;
      setImageImportNote(null);
      try {
        const slides = await deckSlidesFromImageFiles(files);
        const id = `${draft.id}-item-${Date.now()}`;
        setDraft((d) => {
          if (!d) return d;
          return {
            ...d,
            items: [
              ...d.items,
              {
                id,
                kind: "other" as const,
                name: `Imported images (${slides.length})`,
                slides,
              },
            ],
          };
        });
        setImageImportNote(`Added ${slides.length} slide(s) as a new block.`);
      } catch (e) {
        setImageImportNote(e instanceof Error ? e.message : "Could not import images.");
      }
    },
    [draft],
  );

  const addSlide = (itemIndex: number) => {
    setDraft((d) => {
      if (!d) return d;
      const items = [...d.items];
      const item = { ...items[itemIndex]! };
      item.slides = [
        ...item.slides,
        { title: `Slide ${item.slides.length + 1}`, lines: [""] },
      ];
      items[itemIndex] = item;
      return { ...d, items };
    });
  };

  const removeSlide = (itemIndex: number, slideIndex: number) => {
    setDraft((d) => {
      if (!d) return d;
      const items = [...d.items];
      const item = { ...items[itemIndex]! };
      if (item.slides.length <= 1) return d;
      item.slides = item.slides.filter((_, j) => j !== slideIndex);
      items[itemIndex] = item;
      return { ...d, items };
    });
  };

  const songOptions = useMemo(() => {
    void songsVersion;
    return librarySongs;
  }, [librarySongs, songsVersion]);

  if (!ready) {
    return <div className="p-8 text-sm text-wf-muted">Loading…</div>;
  }

  if (!getSetlistById(setlistId)) {
    return (
      <div className="p-8">
        <p className="text-wf-muted">Setlist not found.</p>
        <Link href="/setlists" className="mt-4 inline-block text-sm text-violet-300 hover:underline">
          ← Back to setlists
        </Link>
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/setlists" className="text-xs font-medium text-wf-muted hover:text-wf-text">
            ← Setlists
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Edit setlist</h1>
          <p className="mt-1 text-sm text-wf-muted">
            Add songs from <Link href="/songs" className="text-violet-300 hover:underline">Songs</Link> or
            create new ones. Each song has <strong className="font-medium text-wf-text">multiple slides</strong>
            — Present advances through every slide in order for that item.{" "}
            <Link href="/tutorial" className="text-violet-300 hover:underline">
              Tutorial
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            className="rounded-[12px] bg-gradient-to-r from-blue-600/90 to-violet-600/90 px-4 py-2 text-sm font-semibold text-white"
          >
            {savedFlash ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={removeSetlist}
            className="rounded-[12px] border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300/90 hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-[18px] border border-white/[0.08] bg-wf-card/40 p-4 backdrop-blur-md">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wider text-wf-muted">Name</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="mt-1 h-10 w-full rounded-[10px] border border-white/[0.08] bg-wf-bg/60 px-3 text-sm text-wf-text outline-none focus:ring-2 focus:ring-violet-500/25"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wider text-wf-muted">
            Description
          </span>
          <input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="mt-1 h-10 w-full rounded-[10px] border border-white/[0.08] bg-wf-bg/60 px-3 text-sm text-wf-text outline-none focus:ring-2 focus:ring-violet-500/25"
          />
        </label>
      </div>

      <div className="mt-8 rounded-[16px] border border-violet-500/20 bg-violet-500/[0.06] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/80">Add a song</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-[200px] flex-1">
            <span className="text-[10px] text-wf-muted">From library</span>
            <select
              value={pickSongId}
              onChange={(e) => setPickSongId(e.target.value)}
              className="mt-0.5 h-9 w-full rounded-lg border border-white/[0.1] bg-wf-bg/60 px-2 text-sm text-wf-text outline-none"
            >
              <option value="">Choose a song…</option>
              {songOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={addSongFromLibrary}
            disabled={!pickSongId}
            className="h-9 rounded-lg bg-violet-600/80 px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add to setlist
          </button>
          <button
            type="button"
            onClick={() => setNewSongOpen(true)}
            className="h-9 rounded-lg border border-white/[0.12] px-4 text-sm font-medium text-wf-text hover:border-violet-500/35"
          >
            + New song
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
          <span className="w-full text-[10px] text-wf-muted">Other elements (custom slides)</span>
          <input
            ref={imageImportRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              void importSlidesFromImages(files);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setImageImportNote(null);
              imageImportRef.current?.click();
            }}
            className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200/95 hover:border-emerald-400/45"
          >
            Import slide images
          </button>
          <button
            type="button"
            onClick={() => setScriptureWizardOpen(true)}
            className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-wf-muted hover:border-violet-500/30 hover:text-wf-text"
          >
            + {kindLabel("scripture")}
          </button>
          {CUSTOM_BLOCK_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setCustomBlockKind(k);
                setCustomBlockOpen(true);
              }}
              className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-wf-muted hover:border-violet-500/30 hover:text-wf-text"
            >
              + {kindLabel(k as SetlistItemKind)}
            </button>
          ))}
          <p className="mt-2 w-full text-[10px] leading-relaxed text-wf-muted/90">
            <strong className="font-medium text-wf-text/80">PowerPoint / Keynote:</strong> browsers can’t open
            .pptx or .key files as slides. Export your deck as{" "}
            <strong className="font-medium text-wf-text/80">PNG or JPEG</strong> (one image per slide; File →
            Export in PowerPoint). Then use <strong className="font-medium text-wf-text/80">Import slide images</strong>{" "}
            — up to {MAX_IMAGE_IMPORT_SLIDES} files, ~2.5 MB each. Imports use a sharp full-bleed background so
            graphics look clean on screen.
          </p>
          {imageImportNote ? (
            <p className="w-full text-[10px] text-violet-200/90" role="status">
              {imageImportNote}
            </p>
          ) : null}
        </div>
      </div>

      <NewSongWizardModal
        open={newSongOpen}
        onClose={() => setNewSongOpen(false)}
        contextHint="Saves to your library and adds a row to this setlist. Pick AI (review first) or Manual (paste lyrics)."
        confirmPrimaryLabel="Save to library & setlist"
        onSongCreated={(song) => {
          if (!draft) return;
          const slotId = `${draft.id}-slot-${Date.now()}`;
          setDraft((d) => {
            if (!d) return d;
            return {
              ...d,
              items: [
                ...d.items,
                {
                  id: slotId,
                  kind: "song" as const,
                  songId: song.id,
                  name: song.title,
                  slides: [],
                },
              ],
            };
          });
          setNewSongOpen(false);
        }}
      />

      <ScriptureSetlistWizardModal
        open={scriptureWizardOpen}
        onClose={() => setScriptureWizardOpen(false)}
        onAddScripture={({ name, slides }) => {
          if (!draft) return;
          const id = `${draft.id}-item-${Date.now()}`;
          setDraft((d) => {
            if (!d) return d;
            return {
              ...d,
              items: [
                ...d.items,
                {
                  id,
                  kind: "scripture" as const,
                  name,
                  slides: slides.map((s) => ({ ...s, lines: [...s.lines] })),
                },
              ],
            };
          });
          setScriptureWizardOpen(false);
        }}
      />

      <CustomBlockSetlistWizardModal
        open={customBlockOpen}
        kind={customBlockKind}
        onClose={() => setCustomBlockOpen(false)}
        onAdd={(payload) => {
          if (!draft) return;
          const id = `${draft.id}-item-${Date.now()}`;
          setDraft((d) => {
            if (!d) return d;
            return {
              ...d,
              items: [
                ...d.items,
                {
                  id,
                  kind: payload.kind,
                  name: payload.name,
                  slides: payload.slides.map((s) => ({
                    title: s.title,
                    lines: [...s.lines],
                  })),
                  ...(payload.itemBackgroundUrl?.trim()
                    ? { itemBackgroundUrl: payload.itemBackgroundUrl.trim() }
                    : {}),
                  ...(payload.itemTypography ? { itemTypography: payload.itemTypography } : {}),
                },
              ],
            };
          });
          setCustomBlockOpen(false);
        }}
      />

      <div className="mt-8 space-y-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-wf-muted">Order of service</p>
        <p className="text-[11px] text-wf-muted/90">
          Drag the grip beside each item to change the order.           Use the <strong className="font-medium text-wf-text/90">arrow on the right</strong> of each row
          to show labels, backgrounds, and slide text for one block at a time.
        </p>
        {draft.items.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-white/[0.12] py-10 text-center text-sm text-wf-muted">
            No items yet. Add a song from the library or create a new one above.
          </p>
        ) : null}

        {draft.items.map((item, itemIndex) => {
          const isLinkedSong = item.kind === "song" && !!item.songId;
          const resolved = resolveSlidesForItem(item);
          const slideCount = resolved.length;
          const isExpanded = expandedItemIds.has(item.id);
          const isDragging = dragItemId === item.id;
          const isOver =
            overItemId === item.id && dragItemId !== null && dragItemId !== item.id;
          const panelId = `setlist-item-panel-${item.id}`;

          return (
            <div
              key={item.id}
              onDragOver={(e) => {
                const types = e.dataTransfer.types ?? [];
                const hasPlain = [...types].includes("text/plain");
                if (!dragItemId && !hasPlain) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverItemId(item.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setOverItemId((id) => (id === item.id ? null : id));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromId =
                  e.dataTransfer.getData("text/plain") || dragItemId;
                setDragItemId(null);
                setOverItemId(null);
                if (!fromId || fromId === item.id || !draft) return;
                const fromI = draft.items.findIndex((x) => x.id === fromId);
                const toI = draft.items.findIndex((x) => x.id === item.id);
                if (fromI < 0 || toI < 0) return;
                moveItem(fromI, toI);
              }}
              className={`rounded-[16px] border bg-wf-card/35 p-4 backdrop-blur-sm transition-colors ${
                isOver
                  ? "border-violet-500/50 bg-violet-500/[0.08]"
                  : "border-white/[0.06]"
              } ${isDragging ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", item.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragItemId(item.id);
                    }}
                    onDragEnd={() => {
                      setDragItemId(null);
                      setOverItemId(null);
                    }}
                    className="mt-0.5 flex h-9 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-white/[0.1] bg-wf-bg/40 text-wf-muted outline-none hover:border-violet-500/35 hover:text-wf-text focus-visible:ring-2 focus-visible:ring-violet-500/40 active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-label={`Drag to reorder: ${item.name}`}
                  >
                    <span className="pointer-events-none select-none text-sm leading-none" aria-hidden>
                      ⋮⋮
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs font-semibold text-wf-text">{item.name}</span>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-wf-muted">
                        {kindLabel(item.kind)}
                      </span>
                      {isLinkedSong ? (
                        <span className="text-[10px] text-emerald-400/90">Linked to library</span>
                      ) : null}
                      {!isExpanded ? (
                        <span className="text-[10px] text-wf-muted/90">
                          {slideCount} slide{slideCount === 1 ? "" : "s"}
                          {isLinkedSong ? " · edit in Songs" : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => removeItem(itemIndex)}
                    className="rounded-lg border border-white/[0.08] px-2 py-1 text-xs text-wf-muted hover:text-red-300"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleItemExpanded(item.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-wf-bg/40 text-wf-muted outline-none transition hover:border-violet-500/35 hover:text-wf-text focus-visible:ring-2 focus-visible:ring-violet-500/40"
                    aria-expanded={isExpanded}
                    aria-controls={isExpanded ? panelId : undefined}
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    <span
                      className={`inline-block text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      aria-hidden
                    >
                      ▶
                    </span>
                    <span className="sr-only">{isExpanded ? "Collapse" : "Expand"} block</span>
                  </button>
                </div>
              </div>

              {isExpanded && isLinkedSong && item.songId ? (
                <div
                  id={panelId}
                  className="mt-4 space-y-2 border-t border-white/[0.06] pt-4"
                >
                  <Link
                    href={`/songs?song=${encodeURIComponent(item.songId)}`}
                    className="text-[11px] font-medium text-violet-300 hover:underline"
                  >
                    Edit song in Songs →
                  </Link>
                  <ul className="space-y-1 border-l border-white/[0.08] pl-3">
                    {resolved.map((sl, i) => (
                      <li key={i} className="text-[11px] text-wf-muted">
                        <span className="text-wf-text/90">{sl.title}</span>
                        <span className="text-wf-muted/70"> · {sl.lines.length} lines</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {isExpanded && !isLinkedSong ? (
                <div
                  id={panelId}
                  className="mt-4 space-y-3 border-t border-white/[0.06] pt-4"
                >
                  <label className="block max-w-md">
                    <span className="text-[10px] text-wf-muted">Label</span>
                    <input
                      value={item.name}
                      onChange={(e) => setItem(itemIndex, { name: e.target.value })}
                      className="mt-0.5 h-9 w-full rounded-lg border border-white/[0.08] bg-wf-bg/50 px-2 text-sm"
                    />
                  </label>
                  <SetlistItemStylePanel
                    itemBackgroundUrl={item.itemBackgroundUrl}
                    itemBackgroundColor={item.itemBackgroundColor}
                    itemTypography={item.itemTypography}
                    planLimited={planLimited}
                    onPatch={(patch) => mergeItemStyle(itemIndex, patch)}
                  />
                  {item.slides.map((slide, slideIndex) => (
                    <div
                      key={`${item.id}-s-${slideIndex}`}
                      className="rounded-xl border border-white/[0.05] bg-wf-bg/30 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <input
                          value={slide.title}
                          onChange={(e) =>
                            setSlide(itemIndex, slideIndex, { title: e.target.value })
                          }
                          className="min-w-0 flex-1 rounded-lg border border-white/[0.06] bg-transparent px-2 py-1 text-xs font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => removeSlide(itemIndex, slideIndex)}
                          disabled={item.slides.length <= 1}
                          className="text-[11px] text-wf-muted hover:text-red-300 disabled:opacity-30"
                        >
                          Remove slide
                        </button>
                      </div>
                      <textarea
                        value={slide.lines.join("\n")}
                        onChange={(e) =>
                          setSlide(itemIndex, slideIndex, {
                            lines: e.target.value.split(/\r?\n/),
                          })
                        }
                        rows={Math.min(8, Math.max(2, slide.lines.length + 1))}
                        className="mt-2 w-full resize-y rounded-lg border border-white/[0.06] bg-wf-bg/40 px-2 py-2 font-mono text-xs"
                      />
                      <div className="mt-2 rounded-lg border border-white/[0.05] bg-wf-bg/20 p-2">
                        <p className="text-[9px] font-medium uppercase tracking-wider text-wf-muted/90">
                          This slide only (optional)
                        </p>
                        <label className="mt-1.5 block">
                          <span className="text-[10px] text-wf-muted">Font</span>
                          <select
                            value={slide.typography ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSlide(itemIndex, slideIndex, {
                                typography:
                                  v === "" ? undefined : (v as SlideTypography),
                              });
                            }}
                            className="mt-0.5 h-8 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-2 text-[11px]"
                          >
                            <option value="">Same as block</option>
                            <option value="editorial">Editorial</option>
                            <option value="default">Bold</option>
                          </select>
                        </label>
                        <div className="mt-2">
                          <SlideBackgroundRow
                            slide={slide}
                            presetLimit={6}
                            planLimited={planLimited}
                            onPatch={(patch) => setSlide(itemIndex, slideIndex, patch)}
                            resetButton={{
                              label: "Use block",
                              onClick: () =>
                                setSlide(itemIndex, slideIndex, {
                                  backgroundUrl: undefined,
                                  backgroundColor: undefined,
                                  backgroundFullBleed: undefined,
                                }),
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addSlide(itemIndex)}
                    className="text-[11px] font-medium text-violet-300 hover:text-violet-200"
                  >
                    + Add slide
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
