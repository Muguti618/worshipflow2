/** Persisted slide change effect for presenter / audience / dashboard preview. */

export const SLIDE_TRANSITION_STORAGE_KEY = "worshipflow2.slideTransition";

export type SlideTransitionId = "fade" | "push" | "cross-blur";

export const SLIDE_TRANSITION_OPTIONS: { id: SlideTransitionId; label: string }[] = [
  { id: "fade", label: "Fade" },
  { id: "push", label: "Push" },
  { id: "cross-blur", label: "Cross-blur" },
];

export function parseSlideTransition(raw: string | null | undefined): SlideTransitionId {
  if (raw === "push" || raw === "cross-blur") return raw;
  return "fade";
}

export function readSlideTransition(): SlideTransitionId {
  if (typeof window === "undefined") return "fade";
  try {
    return parseSlideTransition(localStorage.getItem(SLIDE_TRANSITION_STORAGE_KEY));
  } catch {
    return "fade";
  }
}

export function writeSlideTransition(id: SlideTransitionId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SLIDE_TRANSITION_STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent("wf-slide-transition"));
  } catch {
    /* ignore quota */
  }
}
