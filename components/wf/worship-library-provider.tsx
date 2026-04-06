"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { setLibraryMode } from "@/lib/library-mode";
import {
  setLibrarySnapshot,
  WF_LIBRARY_CHANGED_EVENT,
} from "@/lib/library-snapshot";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchUserLibrary } from "@/lib/supabase-library-ops";
import type { SetlistDefinition } from "@/lib/setlists-catalog";
import type { LibrarySong } from "@/lib/songs-catalog";
import { withTimeout } from "@/lib/async-timeout";
import { readUserSetlistsFromDisk } from "@/lib/user-setlists-storage";
import { readUserSongsFromDisk } from "@/lib/user-songs-storage";

const SUPABASE_GET_SESSION_MS = 12_000;
const CLOUD_LIBRARY_FETCH_MS = 20_000;

export const WorshipLibraryContext = createContext<{
  songs: LibrarySong[];
  setlists: SetlistDefinition[];
  version: number;
  loading: boolean;
  refresh: () => Promise<void>;
} | null>(null);

export function WorshipLibraryProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [setlists, setSetlists] = useState<SetlistDefinition[]>([]);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (typeof window === "undefined") return;

    const applyLocalDisk = () => {
      setLibraryMode("local");
      const s = readUserSongsFromDisk();
      const l = readUserSetlistsFromDisk();
      setSongs(s);
      setSetlists(l);
      setLibrarySnapshot(s, l);
      setVersion((v) => v + 1);
      setLoading(false);
    };

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabaseClient();
      if (supabase) {
        let session: { user: { id: string } } | null = null;
        try {
          const { data } = await withTimeout(supabase.auth.getSession(), SUPABASE_GET_SESSION_MS);
          session = data.session;
        } catch {
          session = null;
        }
        if (session?.user?.id) {
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            applyLocalDisk();
            return;
          }
          try {
            const lib = await withTimeout(
              fetchUserLibrary(supabase, session.user.id),
              CLOUD_LIBRARY_FETCH_MS,
            );
            setLibraryMode("cloud");
            setSongs(lib.songs);
            setSetlists(lib.setlists);
            setLibrarySnapshot(lib.songs, lib.setlists);
            setVersion((v) => v + 1);
            setLoading(false);
            return;
          } catch (e) {
            console.error("LumenWorship: failed to load library from Supabase", e);
          }
        }
      }
    }
    applyLocalDisk();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onLib = () => {
      void load();
    };
    window.addEventListener(WF_LIBRARY_CHANGED_EVENT, onLib);
    return () => window.removeEventListener(WF_LIBRARY_CHANGED_EVENT, onLib);
  }, [load]);

  const value = useMemo(
    () => ({
      songs,
      setlists,
      version,
      loading,
      refresh: load,
    }),
    [songs, setlists, version, loading, load],
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
        <p className="text-sm text-wf-muted">Loading your library…</p>
      </div>
    );
  }

  return (
    <WorshipLibraryContext.Provider value={value}>{children}</WorshipLibraryContext.Provider>
  );
}
