"use client";

/** Thin indeterminate bar — motion suggests forward progress without lying about percent. */
export function SlideGenProgressHairline({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="relative h-0.5 w-full overflow-hidden rounded-full bg-white/[0.08]"
      role="progressbar"
      aria-label="Generating slides"
      aria-busy="true"
    >
      <div className="wf-slide-gen-shimmer absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />
    </div>
  );
}
