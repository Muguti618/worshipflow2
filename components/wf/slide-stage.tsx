"use client";

import type { SlideTypography } from "@/lib/setlists-catalog";

const DEFAULT_BG =
  "https://images.unsplash.com/photo-1507692049960-83aac4fc9040?w=1600&q=80";

export type { SlideTypography };

type SlideStageProps = {
  title?: string;
  lines: readonly string[];
  backgroundUrl?: string;
  /** When set (non-empty), fills the stage instead of the image. */
  backgroundColor?: string;
  /** With `backgroundUrl`: sharp image + light scrim (designed slides / exported PNGs). */
  backgroundFullBleed?: boolean;
  className?: string;
  /** Room / projector: edge-to-edge, larger type. `preview`: dashboard hero, larger type, no outer chrome. */
  variant?: "default" | "audience" | "preview";
  /** Subtle slow zoom/pan on background (image only). */
  motion?: boolean;
  /** Minimal / high-contrast vs softer editorial */
  typography?: SlideTypography;
  /**
   * Audience only: prominent reference line at the bottom (e.g. Bible verse).
   * Song section labels stay off; use this for scripture citations.
   */
  audienceFooter?: string;
  /** Free tier: subtle branding strip below footers (e.g. “Powered by …”). */
  tierWatermark?: string;
};

export function SlideStage({
  title,
  lines,
  backgroundUrl,
  backgroundColor,
  backgroundFullBleed = false,
  className = "",
  variant = "default",
  motion = false,
  typography = "default",
  audienceFooter,
  tierWatermark,
}: SlideStageProps) {
  const isAudience = variant === "audience";
  const isPreview = variant === "preview";
  const editorial = typography === "editorial";
  const color = backgroundColor?.trim();
  const useSolid = Boolean(color);
  const imgUrl = (backgroundUrl?.trim() || DEFAULT_BG).trim();
  const fullBleed =
    Boolean(backgroundFullBleed) && Boolean(backgroundUrl?.trim()) && !useSolid;
  const footerText = audienceFooter?.trim();
  const showAudienceFooter = isAudience && Boolean(footerText);
  const watermarkText = tierWatermark?.trim();
  const showTierWatermark = Boolean(watermarkText);

  return (
    <div
      className={`relative overflow-hidden bg-wf-card ${
        isAudience
          ? "flex h-full min-h-0 w-full flex-col rounded-none border-0 shadow-none"
          : "rounded-[18px] border border-white/[0.08] shadow-2xl shadow-black/50"
      } ${className}`}
    >
      {useSolid ? (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : (
        <div
          className={`absolute inset-0 bg-center ${
            fullBleed
              ? "bg-cover bg-center"
              : `scale-110 bg-cover blur-sm ${motion ? "wf-ken-burns" : ""}`
          }`}
          style={{ backgroundImage: `url(${imgUrl})` }}
          aria-hidden
        />
      )}
      <div
        className={
          fullBleed
            ? "absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/50"
            : "absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-900/50 to-slate-950/80"
        }
        aria-hidden
      />
      <div
        className={`relative z-[1] flex min-h-0 w-full flex-col ${
          isAudience ? "min-h-0 flex-1" : "min-h-[220px]"
        }`}
      >
        <div
          className={`flex flex-col items-center justify-center px-6 py-8 text-center md:px-12 md:py-12 ${
            isAudience ? "min-h-0 flex-1" : ""
          }`}
        >
          {title && !isAudience ? (
            <p
              className={`mb-4 font-semibold uppercase tracking-[0.2em] text-white/50 ${
                isPreview ? "text-[10px] tracking-[0.22em]" : "text-[11px] tracking-[0.2em]"
              }`}
            >
              {title}
            </p>
          ) : null}
          <div className={`space-y-3 md:space-y-4 ${isAudience ? "max-w-5xl" : ""}`}>
            {lines.map((line, i) => (
              <p
                key={`${i}-${line.slice(0, 12)}`}
                className={`text-balance leading-snug tracking-tight text-white drop-shadow-md ${
                  editorial
                    ? isAudience
                      ? "text-3xl font-light sm:text-4xl md:text-5xl lg:text-6xl"
                      : isPreview
                        ? "text-[1.35rem] font-light leading-tight sm:text-2xl md:text-3xl lg:text-[2rem]"
                        : "text-xl font-light md:text-2xl"
                    : isAudience
                      ? "text-3xl font-semibold sm:text-4xl md:text-5xl lg:text-6xl"
                      : isPreview
                        ? "text-[1.35rem] font-semibold leading-tight sm:text-2xl md:text-3xl lg:text-[2rem]"
                        : "text-2xl font-semibold md:text-3xl"
                }`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        {showAudienceFooter ? (
          <footer
            className="relative z-[2] shrink-0 border-t-2 border-amber-400/50 bg-gradient-to-b from-black/90 via-slate-950/95 to-black px-5 py-5 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] md:px-10 md:py-6"
            aria-label="Scripture reference"
          >
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.4em] text-amber-200/95 md:text-[11px]">
              Scripture
            </p>
            <p className="mt-2 text-center text-[clamp(1.25rem,4vw,2.25rem)] font-bold leading-tight tracking-tight text-white drop-shadow-lg md:mt-2.5">
              {footerText}
            </p>
          </footer>
        ) : null}

        {showTierWatermark ? (
          <div
            className="relative z-[2] shrink-0 border-t border-white/[0.08] bg-black/55 px-3 py-2 backdrop-blur-sm md:px-6 md:py-2.5"
            aria-label="Plan branding"
          >
            <p className="text-center text-[10px] font-medium tracking-[0.2em] text-white/45 md:text-[11px] md:tracking-[0.24em]">
              {watermarkText}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
