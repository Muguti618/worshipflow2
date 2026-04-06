import type { SetlistDefinition } from "@/lib/setlists-catalog";
import type { LibrarySong } from "@/lib/songs-catalog";

let snapshotSongs: LibrarySong[] = [];
let snapshotSetlists: SetlistDefinition[] = [];

export function setLibrarySnapshot(songs: LibrarySong[], setlists: SetlistDefinition[]): void {
  snapshotSongs = songs;
  snapshotSetlists = setlists;
}

export function getSnapshotSongs(): LibrarySong[] {
  return snapshotSongs;
}

export function getSnapshotSetlists(): SetlistDefinition[] {
  return snapshotSetlists;
}

export const WF_LIBRARY_CHANGED_EVENT = "worshipflow2-library-changed";

export function notifyLibraryChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WF_LIBRARY_CHANGED_EVENT));
}
