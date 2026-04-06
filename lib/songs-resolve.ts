import { BUILTIN_SONGS, type LibrarySong } from "@/lib/songs-catalog";
import { getSnapshotSongs } from "@/lib/library-snapshot";
import { readUserSongsFromDisk } from "@/lib/user-songs-storage";

export function getSongById(id: string): LibrarySong | undefined {
  if (typeof window !== "undefined") {
    const snap = getSnapshotSongs().find((s) => s.id === id);
    if (snap) return snap;
  }
  const u = readUserSongsFromDisk().find((s) => s.id === id);
  if (u) return u;
  return BUILTIN_SONGS.find((s) => s.id === id);
}
