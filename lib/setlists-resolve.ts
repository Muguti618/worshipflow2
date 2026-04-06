import { SETLIST_CATALOG, type SetlistDefinition } from "@/lib/setlists-catalog";
import { readUserSetlists } from "@/lib/user-setlists-storage";

/**
 * Resolve a setlist by id using the same source as the library UI:
 * built-in catalog, then `readUserSetlists()` (cloud → in-memory snapshot only; local → disk).
 * Avoids reading stale localStorage setlists while signed in with an empty cloud library.
 */
export function getSetlistById(id: string): SetlistDefinition | undefined {
  const builtIn = SETLIST_CATALOG.find((s) => s.id === id);
  if (builtIn) return builtIn;
  return readUserSetlists().find((s) => s.id === id);
}
