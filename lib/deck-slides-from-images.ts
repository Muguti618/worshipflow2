import type { DeckSlide } from "@/lib/setlists-catalog";
import {
  MAX_CUSTOM_BACKGROUND_BYTES,
  readImageFileAsDataUrl,
} from "@/lib/read-image-data-url";

/** Cap per import so localStorage / deck JSON stays usable. */
export const MAX_IMAGE_IMPORT_SLIDES = 40;

/**
 * Build one deck slide per image (sorted by file name). Use after exporting PowerPoint/Keynote to PNG/JPEG.
 */
export async function deckSlidesFromImageFiles(files: File[]): Promise<DeckSlide[]> {
  const sorted = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
  );
  const slides: DeckSlide[] = [];
  for (const file of sorted.slice(0, MAX_IMAGE_IMPORT_SLIDES)) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > MAX_CUSTOM_BACKGROUND_BYTES) continue;
    const dataUrl = await readImageFileAsDataUrl(file);
    slides.push({
      title: "",
      lines: [""],
      backgroundUrl: dataUrl,
      backgroundFullBleed: true,
    });
  }
  if (slides.length === 0) {
    throw new Error(
      "No usable images — use JPEG, PNG, or WebP under ~2.5 MB each (see PowerPoint note in the editor).",
    );
  }
  return slides;
}
