import type { LibrarySong } from "@/lib/songs-catalog";
import { withLeadingSongTitleSlide } from "@/lib/slide-engine";
import { getLibraryMode } from "@/lib/library-mode";
import { getSnapshotSongs, notifyLibraryChanged } from "@/lib/library-snapshot";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  cloudDeleteSong,
  cloudInsertSong,
  cloudUpsertSong,
} from "@/lib/supabase-library-ops";

export const USER_SONGS_KEY = "worshipflow-user-songs";
export const USER_SONGS_CHANNEL = "worshipflow-user-songs";

export function broadcastUserSongsChanged(): void {
  try {
    const ch = new BroadcastChannel(USER_SONGS_CHANNEL);
    ch.postMessage({ type: "changed" });
    ch.close();
  } catch {
    /* ignore */
  }
}

/** Raw localStorage read (ignores cloud snapshot). */
export function readUserSongsFromDisk(): LibrarySong[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_SONGS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p as LibrarySong[];
  } catch {
    return [];
  }
}

/** Active library: snapshot when using Supabase, otherwise disk. */
export function readUserSongs(): LibrarySong[] {
  if (typeof window === "undefined") return [];
  if (getLibraryMode() === "cloud") return getSnapshotSongs();
  return readUserSongsFromDisk();
}

export function writeUserSongsAll(list: LibrarySong[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_SONGS_KEY, JSON.stringify(list));
  broadcastUserSongsChanged();
  notifyLibraryChanged();
}

async function cloudUserId(): Promise<string | null> {
  const sb = createBrowserSupabaseClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user.id ?? null;
}

export function addUserSong(song: LibrarySong): void {
  if (getLibraryMode() === "cloud") {
    void (async () => {
      try {
        const sb = createBrowserSupabaseClient();
        const uid = await cloudUserId();
        if (!sb || !uid) return;
        await cloudInsertSong(sb, uid, song);
        notifyLibraryChanged();
      } catch (e) {
        console.error(e);
      }
    })();
    return;
  }
  writeUserSongsAll([...readUserSongsFromDisk(), song]);
}

export async function addUserSongAsync(song: LibrarySong): Promise<LibrarySong> {
  if (getLibraryMode() === "cloud") {
    const sb = createBrowserSupabaseClient();
    const uid = await cloudUserId();
    if (!sb || !uid) throw new Error("Not signed in");
    const inserted = await cloudInsertSong(sb, uid, song);
    notifyLibraryChanged();
    return inserted;
  }
  writeUserSongsAll([...readUserSongsFromDisk(), song]);
  return song;
}

export function updateUserSong(song: LibrarySong): void {
  if (getLibraryMode() === "cloud") {
    void (async () => {
      try {
        const sb = createBrowserSupabaseClient();
        const uid = await cloudUserId();
        if (!sb || !uid) return;
        await cloudUpsertSong(sb, uid, song);
        notifyLibraryChanged();
      } catch (e) {
        console.error(e);
      }
    })();
    return;
  }
  const all = readUserSongsFromDisk();
  const i = all.findIndex((s) => s.id === song.id);
  if (i < 0) return;
  const next = [...all];
  next[i] = song;
  writeUserSongsAll(next);
}

export function removeUserSong(id: string): void {
  if (getLibraryMode() === "cloud") {
    void (async () => {
      try {
        const sb = createBrowserSupabaseClient();
        const uid = await cloudUserId();
        if (!sb || !uid) return;
        await cloudDeleteSong(sb, uid, id);
        notifyLibraryChanged();
      } catch (e) {
        console.error(e);
      }
    })();
    return;
  }
  writeUserSongsAll(readUserSongsFromDisk().filter((s) => s.id !== id));
}

export function createNewUserSong(input: {
  title: string;
  tags?: string[];
  structure?: string;
  slides: LibrarySong["slides"];
  backgroundUrl?: string;
  backgroundColor?: string;
}): LibrarySong {
  const id =
    getLibraryMode() === "cloud" &&
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
      ? crypto.randomUUID()
      : `user-song-${Date.now()}`;
  const songTitle = input.title.trim() || "Untitled song";
  const baseSlides = input.slides.length
    ? input.slides.map((s) => ({ ...s, lines: [...s.lines] }))
    : [{ title: "", lines: [songTitle] }];
  const song: LibrarySong = {
    id,
    title: songTitle,
    tags: input.tags?.length ? input.tags : ["Custom"],
    structure: input.structure?.trim() || "Custom",
    slides: input.slides.length
      ? withLeadingSongTitleSlide(baseSlides, songTitle)
      : baseSlides,
  };
  if (input.backgroundUrl?.trim()) song.backgroundUrl = input.backgroundUrl.trim();
  if (input.backgroundColor?.trim()) song.backgroundColor = input.backgroundColor.trim();
  return song;
}
