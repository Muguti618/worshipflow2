"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useTutorialTour } from "@/components/wf/tutorial-tour-context";

const PAD = 10;

export function TutorialTourOverlay() {
  const { active, stepIndex, steps, nextStep, prevStep, stopTour, total } = useTutorialTour();
  const pathname = usePathname();
  const router = useRouter();
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  const step = steps[stepIndex];
  const stepPath = step?.path ?? "/dashboard";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active || !step) return;
    if (pathname !== step.path) {
      router.push(step.path);
    }
  }, [active, step, pathname, router]);

  const measure = useCallback(() => {
    if (!active || !step || pathname !== step.path) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-wf-tour="${step.target}"]`);
    if (!el || !(el instanceof HTMLElement)) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, [active, step, pathname]);

  useLayoutEffect(() => {
    measure();
    const t = window.setTimeout(measure, 350);
    return () => window.clearTimeout(t);
  }, [measure, active, stepIndex, pathname]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, measure]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopTour();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, stopTour]);

  if (!mounted || !active || !step) return null;

  const topH = rect ? Math.max(0, rect.top) : 0;
  const leftW = rect ? Math.max(0, rect.left) : 0;
  const holeTop = rect?.top ?? 0;
  const holeLeft = rect?.left ?? 0;
  const holeW = rect?.width ?? 0;
  const holeH = rect?.height ?? 0;
  const rightLeft = rect ? holeLeft + holeW : 0;
  const bottomTop = rect ? holeTop + holeH : 0;

  const overlay = (
    <div className="pointer-events-none fixed inset-0 z-[500]" aria-live="polite">
      {/* Dim regions (pointer-events auto so they catch clicks outside the hole) */}
      <div
        className="pointer-events-auto fixed z-[500] bg-black/70 backdrop-blur-[2px]"
        style={{ top: 0, left: 0, right: 0, height: topH }}
      />
      <div
        className="pointer-events-auto fixed z-[500] bg-black/70 backdrop-blur-[2px]"
        style={{
          top: holeTop,
          left: 0,
          width: leftW,
          height: holeH,
        }}
      />
      <div
        className="pointer-events-auto fixed z-[500] bg-black/70 backdrop-blur-[2px]"
        style={{
          top: holeTop,
          left: rightLeft,
          right: 0,
          height: holeH,
        }}
      />
      <div
        className="pointer-events-auto fixed z-[500] bg-black/70 backdrop-blur-[2px]"
        style={{
          top: bottomTop,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Spotlight ring + glow — hole stays click-through (no element here) */}
      {rect && rect.width > 0 && rect.height > 0 ? (
        <div
          className="wf-tour-spotlight-pulse pointer-events-none fixed z-[501] rounded-xl border-2 border-sky-400/70 shadow-[0_0_0_4px_rgba(56,189,248,0.15),0_0_40px_16px_rgba(14,165,233,0.1)]"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      ) : null}

      {/* Tooltip */}
      <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[502] w-[min(92vw,420px)] -translate-x-1/2 rounded-[18px] border border-white/[0.12] bg-wf-card/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400/90">
            Step {stepIndex + 1} / {total}
          </span>
          <button
            type="button"
            onClick={stopTour}
            className="rounded-lg px-2 py-1 text-[11px] font-medium text-wf-muted hover:bg-white/[0.06] hover:text-wf-text"
          >
            Skip tour
          </button>
        </div>
        <h3 className="text-base font-bold text-wf-text">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-wf-muted">{step.body}</p>
        {!rect || rect.width <= 0 ? (
          <p className="mt-2 text-xs text-amber-200/80">
            Couldn&apos;t find this control on screen — try Next after the page finishes loading.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={prevStep}
            disabled={stepIndex === 0}
            className="rounded-[12px] border border-white/[0.12] px-4 py-2 text-sm font-medium text-wf-muted disabled:opacity-30 hover:text-wf-text"
          >
            Back
          </button>
          {stepIndex >= total - 1 ? (
            <button
              type="button"
              onClick={stopTour}
              className="rounded-[12px] bg-slate-600 hover:bg-slate-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/35"
            >
              Finish
            </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-[12px] bg-slate-600 hover:bg-slate-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/35"
            >
              Next
            </button>
          )}
        </div>
      </div>

    </div>
  );

  return createPortal(overlay, document.body);
}
