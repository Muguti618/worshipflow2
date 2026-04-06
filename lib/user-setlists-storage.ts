import type { SetlistDefinition } from "@/lib/setlists-catalog";
import { getLibraryMode } from "@/lib/library-mode";
import { getSnapshotSetlists, notifyLibraryChanged } from "@/lib/library-snapshot";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  cloudDeleteSetlist,
  cloudInsertSetlist,
  cloudUpsertSetlist,
} from "@/lib/supabase-library-ops";

export const USER_SETLISTS_KEY = "worshipflow2-user-setlists";
export const USER_SETLISTS_CHANNEL = "worshipflow2-user-setlists";

export function broadcastUserSetlistsChanged(): void {
  try {
    const ch = new BroadcastChannel(USER_SETLISTS_CHANNEL);
    ch.postMessage({ type: "changed" });
    ch.close();
  } catch {
    /* ignore */
  }
}

export function readUserSetlistsFromDisk(): SetlistDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_SETLISTS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p as SetlistDefinition[];
  } catch {
    return [];
  }
}

export function readUserSetlists(): SetlistDefinition[] {
  if (typeof window === "undefined") return [];
  if (getLibraryMode() === "cloud") return getSnapshotSetlists();
  return readUserSetlistsFromDisk();
}

export function writeUserSetlistsAll(list: SetlistDefinition[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_SETLISTS_KEY, JSON.stringify(list));
  broadcastUserSetlistsChanged();
  notifyLibraryChanged();
}

async function cloudUserId(): Promise<string | null> {
  const sb = createBrowserSupabaseClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user.id ?? null;
}

export function addUserSetlist(def: SetlistDefinition): void {
  if (getLibraryMode() === "cloud") {
    void (async () => {
      try {
        const sb = createBrowserSupabaseClient();
        const uid = await cloudUserId();
        if (!sb || !uid) return;
        await cloudInsertSetlist(sb, uid, def);
        notifyLibraryChanged();
      } catch (e) {
        console.error(e);
      }
    })();
    return;
  }
  writeUserSetlistsAll([...readUserSetlistsFromDisk(), def]);
}

export async function addUserSetlistAsync(def: SetlistDefinition): Promise<SetlistDefinition> {
  if (getLibraryMode() === "cloud") {
    const sb = createBrowserSupabaseClient();
    const uid = await cloudUserId();
    if (!sb || !uid) throw new Error("Not signed in");
    const inserted = await cloudInsertSetlist(sb, uid, def);
    notifyLibraryChanged();
    return inserted;
  }
  writeUserSetlistsAll([...readUserSetlistsFromDisk(), def]);
  return def;
}

export function updateUserSetlist(def: SetlistDefinition): void {
  if (getLibraryMode() === "cloud") {
    void (async () => {
      try {
        const sb = createBrowserSupabaseClient();
        const uid = await cloudUserId();
        if (!sb || !uid) return;
        await cloudUpsertSetlist(sb, uid, def);
        notifyLibraryChanged();
      } catch (e) {
        console.error(e);
      }
    })();
    return;
  }
  const all = readUserSetlistsFromDisk();
  const i = all.findIndex((s) => s.id === def.id);
  if (i < 0) return;
  const next = [...all];
  next[i] = def;
  writeUserSetlistsAll(next);
}

export function removeUserSetlist(id: string): void {
  if (getLibraryMode() === "cloud") {
    void (async () => {
      try {
        const sb = createBrowserSupabaseClient();
        const uid = await cloudUserId();
        if (!sb || !uid) return;
        await cloudDeleteSetlist(sb, uid, id);
        notifyLibraryChanged();
      } catch (e) {
        console.error(e);
      }
    })();
    return;
  }
  writeUserSetlistsAll(readUserSetlistsFromDisk().filter((s) => s.id !== id));
}

export function createBlankUserSetlist(name: string, description: string): SetlistDefinition {
  const id =
    getLibraryMode() === "cloud" &&
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
      ? crypto.randomUUID()
      : `user-${Date.now()}`;
  return {
    id,
    name: name.trim() || "Untitled setlist",
    description: description.trim(),
    items: [],
  };
}
