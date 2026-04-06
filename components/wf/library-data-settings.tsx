"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyLibraryBackupJson,
  buildLibraryBackupPayload,
  clearAllSongsSetlistsAndDeck,
  estimateLumenWorshipStorageBytes,
} from "@/lib/library-data";
import { USER_SETLISTS_CHANNEL } from "@/lib/user-setlists-storage";
import { USER_SONGS_CHANNEL } from "@/lib/user-songs-storage";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10_240 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function LibraryDataSettings() {
  const router = useRouter();
  const [storageBytes, setStorageBytes] = useState(0);
  const [importBusy, setImportBusy] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [eraseAck, setEraseAck] = useState(false);
  const [libTick, setLibTick] = useState(0);

  const refreshStorage = useCallback(() => {
    setStorageBytes(estimateLumenWorshipStorageBytes());
    setLibTick((t) => t + 1);
  }, []);

  useEffect(() => {
    refreshStorage();
  }, [refreshStorage]);

  useEffect(() => {
    const bump = () => setLibTick((t) => t + 1);
    const chS = new BroadcastChannel(USER_SONGS_CHANNEL);
    const chL = new BroadcastChannel(USER_SETLISTS_CHANNEL);
    chS.onmessage = bump;
    chL.onmessage = bump;
    return () => {
      chS.close();
      chL.close();
    };
  }, []);

  const counts = useMemo(() => {
    const p = buildLibraryBackupPayload();
    return { songs: p.songs.length, setlists: p.setlists.length };
  }, [libTick]);

  const exportJson = useCallback(() => {
    setMessage(null);
    const payload = buildLibraryBackupPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `lumenworship-library-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage({
      kind: "ok",
      text: `Downloaded backup (${payload.songs.length} songs, ${payload.setlists.length} setlists).`,
    });
  }, []);

  const onPickImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setMessage(null);
      setImportBusy(true);
      const reader = new FileReader();
      reader.onload = () => {
        void (async () => {
          try {
            const text = typeof reader.result === "string" ? reader.result : "";
            const { songs, setlists } = await applyLibraryBackupJson(text);
            setMessage({
              kind: "ok",
              text: `Restored ${songs} song(s) and ${setlists} setlist(s). Presenter deck was reset — pick a setlist on the dashboard.`,
            });
            refreshStorage();
            router.refresh();
          } catch (err) {
            setMessage({
              kind: "err",
              text: err instanceof Error ? err.message : "Could not import this file.",
            });
          } finally {
            setImportBusy(false);
          }
        })();
      };
      reader.onerror = () => {
        setMessage({ kind: "err", text: "Could not read the file." });
        setImportBusy(false);
      };
      reader.readAsText(file, "utf-8");
    },
    [refreshStorage, router],
  );

  const eraseAll = useCallback(async () => {
    setMessage(null);
    if (!eraseAck) return;
    if (
      !window.confirm(
        "Last step: permanently delete every song and setlist in this browser? This cannot be undone.",
      )
    ) {
      return;
    }
    setClearBusy(true);
    try {
      await clearAllSongsSetlistsAndDeck();
      setEraseAck(false);
      setMessage({
        kind: "ok",
        text: "Library cleared. Songs and setlists are empty; presenter shows the empty placeholder.",
      });
      refreshStorage();
      router.refresh();
    } catch {
      setMessage({ kind: "err", text: "Something went wrong while clearing data." });
    } finally {
      setClearBusy(false);
    }
  }, [eraseAck, refreshStorage, router]);

  return (
    <section className="rounded-[18px] border border-wf-border bg-wf-card/40 p-6 backdrop-blur-md">
      <h2 className="text-sm font-semibold text-wf-text">Library &amp; data</h2>
      <p className="mt-1 text-xs leading-relaxed text-wf-muted">
        Songs, setlists, and the active presenter deck are stored only in this browser (localStorage).
        They are not uploaded to LumenWorship servers. Export a JSON file before clearing or switching
        devices.
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <div className="rounded-lg border border-wf-border bg-wf-bg/40 px-3 py-2">
          <dt className="text-wf-muted">Songs</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-wf-text">{counts.songs}</dd>
        </div>
        <div className="rounded-lg border border-wf-border bg-wf-bg/40 px-3 py-2">
          <dt className="text-wf-muted">Setlists</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-wf-text">{counts.setlists}</dd>
        </div>
        <div className="rounded-lg border border-wf-border bg-wf-bg/40 px-3 py-2 sm:col-span-1">
          <dt className="text-wf-muted">WF storage (approx.)</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-wf-text">{formatBytes(storageBytes)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportJson}
          className="rounded-[10px] border border-wf-input-border bg-wf-bg/80 px-4 py-2 text-sm font-medium text-wf-text transition hover:border-white/20 hover:bg-white/[0.05]"
        >
          Export library (JSON)
        </button>
        <label className="inline-flex cursor-pointer items-center rounded-[10px] border border-wf-input-border bg-wf-bg/80 px-4 py-2 text-sm font-medium text-wf-text transition hover:border-white/20 hover:bg-white/[0.05] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            disabled={importBusy}
            onChange={onPickImport}
          />
          {importBusy ? "Importing…" : "Import library…"}
        </label>
        <button
          type="button"
          onClick={refreshStorage}
          className="rounded-[10px] border border-transparent px-4 py-2 text-sm font-medium text-wf-muted hover:text-wf-text"
        >
          Refresh size
        </button>
      </div>

      {message ? (
        <p
          className={`mt-3 text-sm ${message.kind === "ok" ? "text-emerald-700" : "text-red-600"}`}
          role={message.kind === "err" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-8 border-t border-wf-border pt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-red-600">
          Danger zone
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-wf-muted">
          Removes <strong className="font-medium text-wf-text">all songs</strong>,{" "}
          <strong className="font-medium text-wf-text">all setlists</strong>, resets the{" "}
          <strong className="font-medium text-wf-text">dashboard / presenter deck</strong> to the empty
          placeholder, and clears the <strong className="font-medium text-wf-text">default room</strong>{" "}
          slide index and Bible beam on the server (dev in-memory). Your theme choice and this settings
          page are kept.
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-wf-text">
          <input
            type="checkbox"
            checked={eraseAck}
            onChange={(e) => setEraseAck(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-red-500"
          />
          <span>I understand this permanently deletes my library in this browser.</span>
        </label>
        <button
          type="button"
          disabled={!eraseAck || clearBusy}
          onClick={() => void eraseAll()}
          className="mt-3 rounded-[10px] border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-800 transition enabled:hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {clearBusy ? "Erasing…" : "Erase all songs & setlists"}
        </button>
      </div>
    </section>
  );
}
