"use client";

import { useContext, useMemo } from "react";
import { WorshipLibraryContext } from "@/components/wf/worship-library-provider";
import { SETLIST_CATALOG, type SetlistDefinition } from "@/lib/setlists-catalog";
import { readUserSetlists } from "@/lib/user-setlists-storage";

export function useAllSetlists(): {
  setlists: SetlistDefinition[];
  version: number;
} {
  const ctx = useContext(WorshipLibraryContext);
  if (!ctx) {
    throw new Error("useAllSetlists must be used within WorshipLibraryProvider");
  }
  /** Same backing list as `getSetlistById` / dashboard select (catalog + readUserSetlists). */
  const setlists = useMemo(
    () => [...SETLIST_CATALOG, ...readUserSetlists()],
    [ctx.version],
  );
  return { setlists, version: ctx.version };
}
