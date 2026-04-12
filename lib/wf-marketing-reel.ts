/** In-app marketing / social reel tour — automated walkthrough for screen recording. */

export const WF_MARKETING_OPEN_NEW_SONG = "wf-marketing-open-new-song";
export const WF_MARKETING_WIZARD_SAMPLE = "wf-marketing-wizard-sample";
export const WF_MARKETING_WIZARD_CONFIRM = "wf-marketing-wizard-confirm";

/** Ctrl+Alt+M — avoids browser reload shortcuts. */
export const MARKETING_REEL_HOTKEY_HINT = "Ctrl+Alt+M";

export function marketingReelHotkeySafeTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el?.closest) return true;
  return !el.closest(
    'input, textarea, select, button[aria-haspopup="listbox"], [contenteditable="true"]',
  );
}

/** Short original placeholder for demo recording (not a commercial lyric). */
export const MARKETING_DEMO_SONG_TITLE = "Sunday opener";
export const MARKETING_DEMO_SONG_TAGS = "Demo";
export const MARKETING_DEMO_LYRICS = `VERSE
Still the room
Still the light

CHORUS
We sing as one voice
Hearts lifted high`;
