/** Slide text weight / style in Present and preview (see `SlideStage`). */
export type SlideTypography = "default" | "editorial";

export type DeckSlide = {
  title: string;
  lines: string[];
  /**
   * Full-slide song title card (inserted before lyric slides in the presenter deck).
   * Renders the slide text large, bold, and centered.
   */
  layout?: "song-title";
  /** Stock / custom image URL; ignored when `backgroundColor` is set. */
  backgroundUrl?: string;
  /** Solid fill (hex, rgb, etc.); takes precedence over `backgroundUrl` when presenting. */
  backgroundColor?: string;
  /**
   * When true with a `backgroundUrl`, shows the image sharp (no lyric blur/ken-burns) with a lighter scrim —
   * for uploaded slide graphics or PNGs exported from PowerPoint/Keynote.
   */
  backgroundFullBleed?: boolean;
  /** Overrides block default typography when set. */
  typography?: SlideTypography;
  /**
   * Shown on audience output only, in the footer bar (e.g. passage reference).
   * Song slides usually omit this so section labels stay off the room screen.
   */
  audienceCitation?: string;
};

export type SetlistItemKind = "song" | "prayer" | "scripture" | "moment" | "other";

/**
 * One row in the service order.
 * Songs should set `songId` so slides stay in sync with the Songs library.
 * Other kinds use `slides` only.
 */
export type SetlistItem = {
  id: string;
  kind: SetlistItemKind;
  name: string;
  /** Library song id when kind === "song" (slides come from Songs). */
  songId?: string;
  /** Inline slides (non-song, or fallback if a song was deleted). */
  slides: DeckSlide[];
  /** Default background image for slides that don’t set their own (non-song rows). */
  itemBackgroundUrl?: string;
  /** Default solid background when slides don’t override (non-song rows). */
  itemBackgroundColor?: string;
  /** Default typography for slides that don’t set `slide.typography`. */
  itemTypography?: SlideTypography;
};

export type SetlistDefinition = {
  id: string;
  name: string;
  description: string;
  items: SetlistItem[];
};

/** No bundled setlists — only user-created lists from storage. */
export const SETLIST_CATALOG: SetlistDefinition[] = [];

export function isCatalogSetlistId(_id: string): boolean {
  return false;
}

export function kindLabel(kind: SetlistItemKind): string {
  switch (kind) {
    case "song":
      return "Song";
    case "prayer":
      return "Prayer";
    case "scripture":
      return "Scripture";
    case "moment":
      return "Moment";
    case "other":
      return "Custom";
    default:
      return "Item";
  }
}
