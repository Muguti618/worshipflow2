"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { SlideTransitionId } from "@/lib/slide-transition";

function enterClass(transition: SlideTransitionId): string {
  if (transition === "push") return "wf-slide-enter-push";
  if (transition === "cross-blur") return "wf-slide-enter-blur";
  return "wf-slide-enter-fade";
}

/**
 * Remounts children when `transitionKey` changes and plays the chosen enter animation.
 * Skips animation on the first paint (initial slide) to avoid flashing on load.
 */
export function SlideTransitionShell(props: {
  transition: SlideTransitionId;
  transitionKey: string | number;
  className?: string;
  children: ReactNode;
}) {
  const { transition, transitionKey, className = "", children } = props;
  const skipEnter = useRef(true);
  useEffect(() => {
    skipEnter.current = false;
  }, []);

  const anim = skipEnter.current ? "" : enterClass(transition);

  return (
    <div className={`relative min-h-0 overflow-hidden ${className}`.trim()}>
      <div key={String(transitionKey)} className={`h-full min-h-0 ${anim}`.trim()}>
        {children}
      </div>
    </div>
  );
}
