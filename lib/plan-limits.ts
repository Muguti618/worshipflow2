import type { SlideTransitionId } from "@/lib/slide-transition";

/** Footer strip on slides for logged-in Free plan (Present, Audience, previews). */
export const FREE_TIER_SLIDE_BRANDING = "Powered by worshipflow2";

export const FREE_MAX_SONGS = 3;
export const FREE_MAX_SETLISTS = 1;
export const FREE_MAX_VERSE_BEAMS = 5;

/** Image presets allowed on Free (subset of `BACKGROUND_PRESETS` ids). */
export const FREE_BACKGROUND_PRESET_IDS = ["aurora", "mist", "light"] as const;

/** First N entries from `BACKGROUND_SOLID_SWATCHES` on Free. */
export const FREE_SOLID_SWATCH_COUNT = 4;

export const FREE_TRANSITION_IDS: readonly SlideTransitionId[] = ["fade", "push"];

export function isFreePlanTransition(id: SlideTransitionId): boolean {
  return FREE_TRANSITION_IDS.includes(id);
}
