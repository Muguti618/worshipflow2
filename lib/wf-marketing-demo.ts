/** Browser events for the in-app cinematic marketing walkthrough (dashboard only). */

export const WF_MARKETING_OPEN_NEW_SONG = "wf-marketing-open-new-song";
export const WF_MARKETING_FILL_WAY_MAKER = "wf-marketing-fill-manual-way-maker";
/** Triggers manual “Add to library” in New song wizard (marketing reel). */
export const WF_MARKETING_REEL_CONFIRM_MANUAL_SONG = "wf-marketing-reel-confirm-manual-song";
/** New setlist page: create blank setlist, navigate to edit, bootstrap reel rows. */
export const WF_MARKETING_REEL_CREATE_SETLIST = "wf-marketing-reel-create-setlist";

export const WF_MARKETING_REEL_BOOTSTRAP_SESSION_KEY = "wfMarketingReelBootstrap";

export function marketingDemoHotkeySafeTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el?.closest) return true;
  return !el.closest(
    'input, textarea, select, button[aria-haspopup="listbox"], [contenteditable="true"]',
  );
}

/**
 * Full lyric text for demo recording — paste-only in UI; user must hold appropriate licences for public use.
 * (Way Maker — commonly attributed to Sinach.)
 */
export const WAY_MAKER_DEMO_LYRICS = `You are here
Moving in our midst
I worship you
I worship you

You are here
Working in this place
I worship you
I worship you

Way maker
Miracle worker
Promise keeper
Light in the darkness
My God
That's who You are

Way maker
Miracle worker
Promise keeper
Light in the darkness
My God
That's who You are

You are here
Touching every heart
I worship you
I worship you

You are here
Healing every heart
I worship you
I worship you

You are here
Turning lives around
I worship you
I worship you

You are here
Mending every heart
I worship you
I worship you

Even when I don't see it, You're working
Even when I don't feel it, You're working
You never stop, You never stop working
You never stop, You never stop working

Way maker
Miracle worker
Promise keeper
Light in the darkness
My God
That's who You are

Way maker
Miracle worker
Promise keeper
Light in the darkness
My God
That's who You are

Way maker
Miracle worker
Promise keeper
Light in the darkness
My God
That's who You are

Way maker
Miracle worker
Promise keeper
Light in the darkness
My God
That's who You are`;
