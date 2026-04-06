"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseAutosaveOptions<T> = {
  data: T | null;
  enabled: boolean;
  canSave?: boolean;
  save: (payload: T) => void;
  quiet?: boolean;
  /** Ms with no edits before save (after typing pauses). Default 2200. */
  idleMs?: number;
  /** Min ms between edits to count as a separate “action” toward batch save. Default 500. */
  actionGapMs?: number;
  /** Save immediately after this many spaced actions (gap ≥ actionGapMs). Default 3. */
  saveAfterActions?: number;
};

function fingerprint(x: unknown): string {
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

function entityId(d: unknown): string {
  if (d && typeof d === "object" && "id" in d && typeof (d as { id: unknown }).id === "string") {
    return (d as { id: string }).id;
  }
  return "";
}

/**
 * Autosave that avoids rapid fire:
 * - Saves after `idleMs` with no changes (typing stopped).
 * - Saves after `saveAfterActions` edits spaced at least `actionGapMs` apart (deliberate steps / clicks).
 * - Flushes when the tab is hidden or the component unmounts (leaving the page).
 * Call `markSaved()` after a manual Save so the hook doesn’t think there is still a pending change.
 */
export function useAutosave<T>({
  data,
  enabled,
  canSave = true,
  save,
  quiet = false,
  idleMs = 2200,
  actionGapMs = 500,
  saveAfterActions = 3,
}: UseAutosaveOptions<T>): {
  autosaveNote: string | null;
  markSaved: () => void;
} {
  const ref = useRef(data);
  ref.current = data;
  const saveRef = useRef(save);
  saveRef.current = save;
  const canSaveRef = useRef(canSave);
  canSaveRef.current = canSave;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const quietRef = useRef(quiet);
  quietRef.current = quiet;

  const lastSavedFp = useRef<string | null>(null);
  const slowActionCount = useRef(0);
  const lastChangeTs = useRef(0);
  const idleTimerRef = useRef<number | null>(null);

  const [autosaveNote, setAutosaveNote] = useState<string | null>(null);

  const showNote = useCallback(() => {
    if (quietRef.current) return;
    setAutosaveNote("Auto-saved");
    window.setTimeout(() => setAutosaveNote(null), 2200);
  }, []);

  const clearIdleTimer = useCallback(() => {
    const id = idleTimerRef.current;
    if (id != null) {
      window.clearTimeout(id);
      idleTimerRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    const p = ref.current;
    if (!p || !canSaveRef.current || !enabledRef.current) return;
    const fp = fingerprint(p);
    if (fp === lastSavedFp.current) return;
    clearIdleTimer();
    saveRef.current(p);
    lastSavedFp.current = fp;
    slowActionCount.current = 0;
    showNote();
  }, [clearIdleTimer, showNote]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  const markSaved = useCallback(() => {
    const p = ref.current;
    lastSavedFp.current = p ? fingerprint(p) : null;
    slowActionCount.current = 0;
    clearIdleTimer();
  }, [clearIdleTimer]);

  const entityKey = enabled && canSave && data ? entityId(data) : "";

  useEffect(() => {
    if (!enabled) {
      lastSavedFp.current = null;
      slowActionCount.current = 0;
      lastChangeTs.current = 0;
      clearIdleTimer();
      return;
    }
    if (!canSave || !entityKey) return;

    const p = ref.current;
    if (!p) return;
    lastSavedFp.current = fingerprint(p);
    slowActionCount.current = 0;
    lastChangeTs.current = Date.now();
  }, [entityKey, enabled, canSave, clearIdleTimer]);

  useEffect(() => {
    if (!enabled || !data || !canSave) return;

    const fp = fingerprint(data);
    if (fp === lastSavedFp.current) return;

    const now = Date.now();
    const prevTs = lastChangeTs.current;
    lastChangeTs.current = now;
    const gap = prevTs > 0 ? now - prevTs : actionGapMs;

    if (gap >= actionGapMs) {
      slowActionCount.current += 1;
    }

    clearIdleTimer();

    if (slowActionCount.current >= saveAfterActions) {
      flush();
      return;
    }

    idleTimerRef.current = window.setTimeout(() => {
      idleTimerRef.current = null;
      flush();
    }, idleMs) as unknown as number;

    return clearIdleTimer;
  }, [data, enabled, canSave, idleMs, actionGapMs, saveAfterActions, flush, clearIdleTimer]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== "hidden") return;
      flushRef.current();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);

  useEffect(() => {
    return () => {
      flushRef.current();
    };
  }, []);

  return { autosaveNote, markSaved };
}
