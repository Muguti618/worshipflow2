"use client";

import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { useSlideTransition } from "@/hooks/use-slide-transition";
import { FREE_TRANSITION_IDS } from "@/lib/plan-limits";
import { SLIDE_TRANSITION_OPTIONS, type SlideTransitionId } from "@/lib/slide-transition";

export function PresentationTransitionSettings() {
  const [transition, setTransition] = useSlideTransition();
  const { limitsApply } = usePlanEntitlements();
  const options = limitsApply
    ? SLIDE_TRANSITION_OPTIONS.filter((o) => FREE_TRANSITION_IDS.includes(o.id))
    : SLIDE_TRANSITION_OPTIONS;

  return (
    <div className="mt-4 space-y-2">
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm text-wf-muted">Default transition</span>
        <select
          value={options.some((o) => o.id === transition) ? transition : options[0]!.id}
          onChange={(e) => setTransition(e.target.value as SlideTransitionId)}
          className="rounded-[10px] border border-wf-input-border bg-wf-bg/80 px-3 py-2 text-sm text-wf-text outline-none"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {limitsApply ? (
        <p className="text-[11px] leading-snug text-amber-200/75">
          Free plan includes fade and push. Cross-blur is on Pro.
        </p>
      ) : null}
    </div>
  );
}
