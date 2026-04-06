import type { DeckSlide, SetlistItem } from "@/lib/setlists-catalog";
import type { LibrarySong } from "@/lib/songs-catalog";
import { getSongById } from "@/lib/songs-resolve";

function cloneSlide(s: DeckSlide): DeckSlide {
  const next: DeckSlide = {
    ...s,
    lines: [...s.lines],
  };
  return next;
}

/** Merge saved block defaults into each slide for Present (non-song rows). */
function withInlineItemDefaults(item: SetlistItem, slides: DeckSlide[]): DeckSlide[] {
  return slides.map((s) => {
    const lines = [...s.lines];
    const slideHasOwnBg =
      Boolean(s.backgroundUrl?.trim()) || Boolean(s.backgroundColor?.trim());
    const url = slideHasOwnBg
      ? s.backgroundUrl?.trim()
      : item.itemBackgroundUrl?.trim();
    const color = slideHasOwnBg
      ? s.backgroundColor?.trim()
      : item.itemBackgroundColor?.trim();
    const typography = s.typography ?? item.itemTypography;
    const next: DeckSlide = { title: s.title, lines };
    if (url) next.backgroundUrl = url;
    if (color) next.backgroundColor = color;
    if (typography) next.typography = typography;
    if (s.backgroundFullBleed) next.backgroundFullBleed = true;
    if (s.audienceCitation?.trim()) next.audienceCitation = s.audienceCitation.trim();
    return next;
  });
}

function cloneSlides(slides: DeckSlide[]): DeckSlide[] {
  return slides.map(cloneSlide);
}

function withSongBackgrounds(song: LibrarySong, slides: DeckSlide[]): DeckSlide[] {
  return slides.map((s) => {
    const lines = [...s.lines];
    const slideHasOwn =
      Boolean(s.backgroundUrl?.trim()) || Boolean(s.backgroundColor?.trim());
    if (slideHasOwn) {
      return {
        title: s.title,
        lines,
        ...(s.backgroundUrl?.trim() ? { backgroundUrl: s.backgroundUrl.trim() } : {}),
        ...(s.backgroundColor?.trim() ? { backgroundColor: s.backgroundColor.trim() } : {}),
        ...(s.backgroundFullBleed ? { backgroundFullBleed: true } : {}),
        ...(s.typography ? { typography: s.typography } : {}),
        ...(s.audienceCitation?.trim() ? { audienceCitation: s.audienceCitation.trim() } : {}),
      };
    }
    return {
      title: s.title,
      lines,
      ...(song.backgroundUrl?.trim() ? { backgroundUrl: song.backgroundUrl.trim() } : {}),
      ...(song.backgroundColor?.trim() ? { backgroundColor: song.backgroundColor.trim() } : {}),
      ...(s.typography ? { typography: s.typography } : {}),
      ...(s.audienceCitation?.trim() ? { audienceCitation: s.audienceCitation.trim() } : {}),
    };
  });
}

function songTitleCardSlide(label: string, from: DeckSlide): DeckSlide {
  const t = label.trim() || "Song";
  const card: DeckSlide = {
    title: "",
    lines: [t],
    layout: "song-title",
  };
  if (from.backgroundUrl?.trim()) card.backgroundUrl = from.backgroundUrl.trim();
  if (from.backgroundColor?.trim()) card.backgroundColor = from.backgroundColor.trim();
  if (from.backgroundFullBleed) card.backgroundFullBleed = true;
  if (from.typography) card.typography = from.typography;
  return card;
}

function prependSongTitleCard(name: string, slides: DeckSlide[]): DeckSlide[] {
  if (slides.length === 0) return slides;
  return [songTitleCardSlide(name, slides[0]!), ...slides];
}

/** Slides used in presenter for one setlist row (library song or inline). */
export function resolveSlidesForItem(item: SetlistItem): DeckSlide[] {
  if (item.kind === "song" && item.songId) {
    const song = getSongById(item.songId);
    if (song?.slides?.length) {
      const deck = withSongBackgrounds(song, cloneSlides(song.slides));
      const label = song.title?.trim() || item.name?.trim() || "Song";
      return prependSongTitleCard(label, deck);
    }
    if (item.slides.length) {
      const deck = withInlineItemDefaults(item, cloneSlides(item.slides));
      const label = item.name?.trim() || "Song";
      return prependSongTitleCard(label, deck);
    }
    return [
      {
        title: item.name || "Song",
        lines: ["Song not found in library — pick another or restore the song."],
      },
    ];
  }
  return withInlineItemDefaults(item, cloneSlides(item.slides));
}

export function flattenSetlistToDeck(items: SetlistItem[]): DeckSlide[] {
  const out = items.flatMap((item) => resolveSlidesForItem(item));
  if (out.length === 0) {
    return [
      {
        title: "Empty setlist",
        lines: ["Add songs from your library using the setlist editor."],
      },
    ];
  }
  return out;
}

export function itemRangesInDeck(items: SetlistItem[]): {
  item: SetlistItem;
  startIndex: number;
  count: number;
}[] {
  let offset = 0;
  return items.map((item) => {
    const slides = resolveSlidesForItem(item);
    const startIndex = offset;
    const count = slides.length;
    offset += count;
    return { item, startIndex, count };
  });
}
