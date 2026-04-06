"use client";

import { useContext, useMemo } from "react";
import { WorshipLibraryContext } from "@/components/wf/worship-library-provider";
import { BUILTIN_SONGS, type LibrarySong } from "@/lib/songs-catalog";

export function useAllSongs(): { songs: LibrarySong[]; version: number } {
  const ctx = useContext(WorshipLibraryContext);
  if (!ctx) {
    throw new Error("useAllSongs must be used within WorshipLibraryProvider");
  }
  const songs = useMemo(() => [...BUILTIN_SONGS, ...ctx.songs], [ctx.songs]);
  return { songs, version: ctx.version };
}
