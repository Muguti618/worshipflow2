/** In-app “Reel Director” — automated UI tour for screen recording (dashboard shell only). */

export const WF_REEL_OPEN_NEW_SONG = "wf-reel-open-new-song";
/** Wizard: jump to manual step + fill sample fields (does not save). */
export const WF_REEL_WIZARD_SAMPLE_LYRICS = "wf-reel-wizard-sample-lyrics";
/** Wizard: run the same confirm as “Add to library” on manual step. */
export const WF_REEL_WIZARD_CONFIRM_SONG = "wf-reel-wizard-confirm-song";

export function reelDirectorHotkeySafeTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el?.closest) return true;
  return !el.closest(
    'input, textarea, select, button[aria-haspopup="listbox"], [contenteditable="true"]',
  );
}

/**
 * Short original placeholder lyrics for demos (not a known commercial song).
 * Replace with your own licensed text for public ads.
 */
export const REEL_SAMPLE_SONG_TITLE = "Gather Us In";
export const REEL_SAMPLE_SONG_TAGS = "Demo, Opener";
export const REEL_SAMPLE_LYRICS = `VERSE
Lift your eyes
The room is still

CHORUS
We're here together
To sing, to listen

BRIDGE
One room, one story
Carried in light`;
