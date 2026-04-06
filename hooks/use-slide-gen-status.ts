"use client";

import { useEffect, useState } from "react";

/** Short phrases that rotate while slides are generating — feels active without stretching time. */
export const SLIDE_GEN_STATUS_LINES = [
  "Mapping verses and choruses…",
  "Balancing lines for readability…",
  "Tuning slide breaks…",
  "Almost ready…",
] as const;

/**
 * Cycles through messages while `active` — makes waits feel shorter than a static spinner.
 */
export function useSlideGenStatus(active: boolean, intervalMs = 750) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) {
      setIdx(0);
      return;
    }
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % SLIDE_GEN_STATUS_LINES.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);

  return active ? SLIDE_GEN_STATUS_LINES[idx] : null;
}

/** Lets React paint optimistic UI before fetch runs (small perceived-latency win). */
export function flushPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
