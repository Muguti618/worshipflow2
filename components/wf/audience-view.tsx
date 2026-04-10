"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { useActiveDeck } from "@/hooks/use-active-deck";
import { useRoomSlide } from "@/hooks/use-room-slide";
import type { DeckSlide } from "@/lib/setlists-catalog";
import { SlideTransitionShell } from "@/components/wf/slide-transition-shell";
import { SlideStage } from "@/components/wf/slide-stage";
import { useSlideTransition } from "@/hooks/use-slide-transition";
import { FREE_TIER_SLIDE_BRANDING } from "@/lib/plan-limits";

/** Lyric slide section labels (must not use the amber “Scripture” footer). */
const SONG_SECTION_TITLE_RE =
  /^\s*(pre[-\s]?chorus|verse|chorus|bridge|tag|intro|outro|section|hook|refrain|vamp)(\s+\d+)?\s*:?\s*$/i;

/** Footer citation for audience: explicit field, beam title, or scripture-style title (not song sections). */
function audienceCitationForSlide(slide: DeckSlide, beamActive: boolean): string | undefined {
  const marked = slide.audienceCitation?.trim();
  if (marked) return marked;
  if (beamActive) {
    const t = slide.title?.trim();
    if (t && SONG_SECTION_TITLE_RE.test(t)) return undefined;
    return t || undefined;
  }
  const t = slide.title?.trim();
  if (!t) return undefined;
  if (t.includes(" · ")) return undefined;
  if (/empty setlist|no setlist loaded|song not found/i.test(t)) return undefined;
  if (SONG_SECTION_TITLE_RE.test(t)) return undefined;
  if (t.length > 96) return undefined;
  if (!/\d/.test(t)) return undefined;
  if (/^(track|slide)\s+\d/i.test(t)) return undefined;
  /** Passage-shaped ref (colon verse, range, or book + chapter). Song sections are excluded above. */
  const refLike =
    /:\d/.test(t) ||
    /\d\s*[–—]\s*\d/.test(t) ||
    /^[1-4]?\s*[a-z]{3,}\s+\d{1,3}\s*:\s*\d/.test(t) ||
    /^[1-4]?\s*[a-z]{3,}\s+\d{1,3}\b/.test(t);
  if (!refLike) return undefined;
  return t;
}

function enterFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen?.();
  return req ?? Promise.reject(new Error("Unsupported"));
}

export function AudienceView({ room }: { room: string }) {
  const { limitsApply, ready } = usePlanEntitlements();
  const deck = useActiveDeck();
  const count = Math.max(1, deck.length);
  const { index: i, beam } = useRoomSlide({
    room,
    role: "viewer",
    slideCount: count,
  });

  const [fs, setFs] = useState(false);
  const [slideTransition] = useSlideTransition();
  const deckSlide = deck[Math.min(i, deck.length - 1)]!;
  const beamSlides = beam?.slides;
  const beamIdx = beam?.index ?? 0;
  const current =
    beamSlides && beamSlides.length > 0
      ? beamSlides[Math.min(beamIdx, beamSlides.length - 1)]!
      : deckSlide;
  const beamActive = Boolean(beamSlides && beamSlides.length > 0);
  const audienceFooter = audienceCitationForSlide(current, beamActive);
  const onScreenTransitionKey =
    beamSlides && beamSlides.length > 0 ? `beam-${beamIdx}` : `deck-${i}`;

  useEffect(() => {
    const sync = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const goFullscreen = useCallback(() => {
    void enterFullscreen().catch(() => {});
  }, []);

  return (
    <div className="relative flex h-dvh w-full flex-col bg-black">
      {!fs ? (
        <div className="absolute right-3 top-3 z-10">
          <button
            type="button"
            onClick={goFullscreen}
            className="rounded-lg border border-white/15 bg-black/50 px-3 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-md hover:bg-black/70 hover:text-white"
          >
            Fullscreen (optional)
          </button>
        </div>
      ) : null}
      <SlideTransitionShell
        transition={slideTransition}
        transitionKey={onScreenTransitionKey}
        className="flex min-h-0 flex-1 flex-col"
      >
        <SlideStage
          variant="audience"
          className="min-h-0 flex-1"
          title={current.title}
          lines={current.lines}
          layout={current.layout}
          backgroundUrl={current.backgroundUrl}
          backgroundColor={current.backgroundColor}
          backgroundFullBleed={current.backgroundFullBleed}
          motion={!current.backgroundColor?.trim() && !current.backgroundFullBleed}
          typography={current.typography ?? "editorial"}
          audienceFooter={audienceFooter}
          tierWatermark={ready && limitsApply ? FREE_TIER_SLIDE_BRANDING : undefined}
        />
      </SlideTransitionShell>
    </div>
  );
}
