"use client";

import { useEffect, useId, useRef } from "react";
import type { DeckSlide } from "@/lib/setlists-catalog";
import { slideSubtitlePreview } from "@/lib/present-slide-nav";

type Props = {
  open: boolean;
  onClose: () => void;
  deck: DeckSlide[];
  activeIndex: number;
  onJump: (index: number) => void;
  /** Shown under the title when a Bible / song beam is overriding the deck */
  beamHint?: string | null;
};

export function PresentSlidePicker({
  open,
  onClose,
  deck,
  activeIndex,
  onJump,
  beamHint,
}: Props) {
  const titleId = useId();
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [open, activeIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(78vh,32rem)] w-full max-w-lg flex-col rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-white">
              Go to slide
            </h2>
            <p className="mt-0.5 text-[11px] text-white/45">
              Tap a slide to jump. Preview shows lyric lines from each step.
            </p>
            {beamHint ? (
              <p className="mt-1.5 text-[11px] font-medium text-amber-200/85">{beamHint}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2.5 py-1 text-sm text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
          <ul className="space-y-1">
            {deck.map((slide, idx) => {
              const active = idx === activeIndex;
              return (
                <li key={`slide-${idx}`}>
                  <button
                    type="button"
                    ref={active ? activeRef : undefined}
                    onClick={() => {
                      onJump(idx);
                      onClose();
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-blue-600/25 ring-1 ring-blue-500/50"
                        : "hover:bg-white/[0.06]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
                        active ? "bg-blue-500 text-white" : "bg-white/10 text-white/80"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">
                        {slide.title?.trim() || `Slide ${idx + 1}`}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/50">
                        {slideSubtitlePreview(slide)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
