import {
  ACTIVE_DECK_STORAGE_KEY,
  ACTIVE_SETLIST_ID_KEY,
  broadcastDeckUpdated,
  broadcastSlideReset,
  EMPTY_PRESENTER_PLACEHOLDER,
  postPresenterSlide,
  writeActiveDeck,
} from "@/lib/active-deck";
import { presentRoomKeyFromActiveSetlist } from "@/lib/present-room-key";
import { getLibraryMode } from "@/lib/library-mode";
import type { SetlistDefinition } from "@/lib/setlists-catalog";
import type { LibrarySong } from "@/lib/songs-catalog";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  cloudClearLibrary,
  cloudReplaceAllLibrary,
} from "@/lib/supabase-library-ops";
import { WF_THEME_STORAGE_KEY } from "@/lib/theme-preference";
import {
  readUserSetlists,
  USER_SETLISTS_KEY,
  writeUserSetlistsAll,
} from "@/lib/user-setlists-storage";
import {
  readUserSongs,
  USER_SONGS_KEY,
  writeUserSongsAll,
} from "@/lib/user-songs-storage";

export const LIBRARY_BACKUP_VERSION = 1 as const;

export type LibraryBackupPayload = {
  version: typeof LIBRARY_BACKUP_VERSION;
  exportedAt: string;
  songs: LibrarySong[];
  setlists: SetlistDefinition[];
};

export function buildLibraryBackupPayload(): LibraryBackupPayload {
  return {
    version: LIBRARY_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    songs: readUserSongs(),
    setlists: readUserSetlists(),
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/** Ensure Postgres uuid PKs and remap setlist songId references for cloud import. */
function remapLibraryForCloud(
  songs: LibrarySong[],
  setlists: SetlistDefinition[],
): { songs: LibrarySong[]; setlists: SetlistDefinition[] } {
  const songIdMap = new Map<string, string>();
  const nextSongs = songs.map((s) => {
    const nid = isUuid(s.id) ? s.id : crypto.randomUUID();
    if (s.id !== nid) songIdMap.set(s.id, nid);
    return { ...s, id: nid };
  });
  const nextSetlists = setlists.map((d) => {
    const nid = isUuid(d.id) ? d.id : crypto.randomUUID();
    const items = d.items.map((item) => {
      if (!item.songId) return item;
      const mapped = songIdMap.get(item.songId) ?? (isUuid(item.songId) ? item.songId : undefined);
      if (mapped) return { ...item, songId: mapped };
      return { ...item };
    });
    return { ...d, id: nid, items };
  });
  return { songs: nextSongs, setlists: nextSetlists };
}

/**
 * Replace songs + setlists from an export file; resets presenter deck to the empty placeholder.
 */
export async function applyLibraryBackupJson(
  jsonText: string,
): Promise<{ songs: number; setlists: number }> {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error("The file is not valid JSON.");
  }
  if (!isRecord(raw) || raw.version !== LIBRARY_BACKUP_VERSION) {
    throw new Error("This file is not a worshipflow2 library backup (expected version 1).");
  }
  if (!Array.isArray(raw.songs) || !Array.isArray(raw.setlists)) {
    throw new Error("Backup is missing songs or setlists.");
  }
  let songs = raw.songs as LibrarySong[];
  let setlists = raw.setlists as SetlistDefinition[];

  if (typeof window !== "undefined" && isSupabaseConfigured() && getLibraryMode() === "cloud") {
    const sb = createBrowserSupabaseClient();
    const { data } = await sb?.auth.getSession() ?? { data: { session: null } };
    const uid = data.session?.user.id;
    if (!sb || !uid) throw new Error("You must be signed in to restore to the cloud library.");
    const remapped = remapLibraryForCloud(songs, setlists);
    songs = remapped.songs;
    setlists = remapped.setlists;
    await cloudReplaceAllLibrary(sb, uid, songs, setlists);
  } else {
    writeUserSongsAll(songs);
    writeUserSetlistsAll(setlists);
  }

  const presentRoom = presentRoomKeyFromActiveSetlist();
  writeActiveDeck(EMPTY_PRESENTER_PLACEHOLDER, "");
  broadcastDeckUpdated();
  broadcastSlideReset(presentRoom);
  void postPresenterSlide(presentRoom, 0);
  void clearPresenterBeamServerSide(presentRoom);
  return { songs: songs.length, setlists: setlists.length };
}

async function clearPresenterBeamServerSide(room: string): Promise<void> {
  try {
    await fetch("/api/present/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room,
        slideIndex: 0,
        beam: null,
      }),
    });
  } catch {
    /* offline */
  }
}

/** Remove every user song and setlist, reset deck & default room presenter state (local + server stub). */
export async function clearAllSongsSetlistsAndDeck(): Promise<void> {
  if (typeof window !== "undefined" && isSupabaseConfigured() && getLibraryMode() === "cloud") {
    const sb = createBrowserSupabaseClient();
    const { data } = await sb?.auth.getSession() ?? { data: { session: null } };
    const uid = data.session?.user.id;
    if (sb && uid) {
      await cloudClearLibrary(sb, uid);
    }
  }
  writeUserSongsAll([]);
  writeUserSetlistsAll([]);
  const presentRoom = presentRoomKeyFromActiveSetlist();
  writeActiveDeck(EMPTY_PRESENTER_PLACEHOLDER, "");
  broadcastDeckUpdated();
  broadcastSlideReset(presentRoom);
  void postPresenterSlide(presentRoom, 0);
  await clearPresenterBeamServerSide(presentRoom);
}

/** Rough size of app library keys in localStorage (UTF-16 string length × 2). */
export function estimateWorshipflow2StorageBytes(): number {
  if (typeof window === "undefined") return 0;
  const keys = [
    USER_SONGS_KEY,
    USER_SETLISTS_KEY,
    ACTIVE_DECK_STORAGE_KEY,
    ACTIVE_SETLIST_ID_KEY,
    WF_THEME_STORAGE_KEY,
  ];
  let n = 0;
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v) n += k.length + v.length;
  }
  return n * 2;
}
