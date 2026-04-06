import type { DeckSlide } from "@/lib/setlists-catalog";

/** A song in the library — slides are what the presenter uses. */
export type LibrarySong = {
  id: string;
  title: string;
  tags: string[];
  structure: string;
  slides: DeckSlide[];
  /** Default slide background image (each slide can override). */
  backgroundUrl?: string;
  /** Default solid background (overrides image for all slides unless a slide sets its own). */
  backgroundColor?: string;
};

/** No bundled songs — library is user-created only. */
export const BUILTIN_SONGS: LibrarySong[] = [];

export function isBuiltinSongId(_id: string): boolean {
  return false;
}
