"use client";

import { BackgroundUploadControl } from "@/components/wf/background-upload-control";
import { BACKGROUND_PRESETS, BACKGROUND_SOLID_SWATCHES } from "@/lib/background-presets";
import type { DeckSlide } from "@/lib/setlists-catalog";
import { isDataUrlImage } from "@/lib/read-image-data-url";
import {
  FREE_BACKGROUND_PRESET_IDS,
  FREE_SOLID_SWATCH_COUNT,
} from "@/lib/plan-limits";

type Props = {
  slide: DeckSlide;
  onPatch: (patch: Partial<DeckSlide>) => void;
  /** How many stock thumbnails to show (setlist rows use fewer). */
  presetLimit?: number;
  /** Free tier: small preset set, no custom upload / URL / picker (see marketing). */
  planLimited?: boolean;
  resetButton?: { label: string; onClick: () => void };
};

export function SlideBackgroundRow(props: Props) {
  const { slide, onPatch, presetLimit = 6, planLimited = false, resetButton } = props;
  const freeIds = new Set<string>(FREE_BACKGROUND_PRESET_IDS);
  const presets = planLimited
    ? BACKGROUND_PRESETS.filter((p) => freeIds.has(p.id))
    : BACKGROUND_PRESETS.slice(0, presetLimit);
  const solidSwatches = planLimited
    ? BACKGROUND_SOLID_SWATCHES.slice(0, FREE_SOLID_SWATCH_COUNT)
    : [...BACKGROUND_SOLID_SWATCHES];
  const hasImageBg = Boolean(slide.backgroundUrl?.trim() && !slide.backgroundColor?.trim());

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-wf-muted">Background (this slide)</p>
      {planLimited ? (
        <p className="text-[10px] leading-snug text-amber-200/80">
          Free plan: core presets and a few colours only.{" "}
          <span className="text-wf-muted">Upgrade for the full library, uploads, and custom URLs.</span>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => {
          const on = slide.backgroundUrl === p.url && !slide.backgroundColor?.trim();
          return (
            <button
              key={p.id}
              type="button"
              title={p.label}
              onClick={() =>
                onPatch({
                  backgroundUrl: p.url,
                  backgroundColor: undefined,
                  backgroundFullBleed: undefined,
                })
              }
              className={`h-8 w-8 overflow-hidden rounded-md border ${
                on ? "border-sky-500/40 ring-1 ring-sky-500/40" : "border-white/10"
              }`}
            >
              <span
                className="block h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${p.url})` }}
              />
            </button>
          );
        })}
        {!planLimited ? (
          <BackgroundUploadControl
            variant="tile"
            tileClassName="!h-8 !w-8 !text-[7px]"
            isActive={Boolean(
              slide.backgroundUrl?.trim() && isDataUrlImage(slide.backgroundUrl) && !slide.backgroundColor?.trim(),
            )}
            onDataUrl={(u) =>
              onPatch({
                backgroundUrl: u,
                backgroundColor: undefined,
                backgroundFullBleed: undefined,
              })
            }
          />
        ) : null}
        {solidSwatches.map((hex) => {
          const on = slide.backgroundColor === hex;
          return (
            <button
              key={hex}
              type="button"
              title={hex}
              onClick={() =>
                onPatch({
                  backgroundColor: hex,
                  backgroundUrl: undefined,
                  backgroundFullBleed: undefined,
                })
              }
              className={`h-8 w-8 rounded-md border-2 ${
                on ? "border-sky-500/40 ring-1 ring-sky-500/40" : "border-white/15"
              }`}
              style={{ backgroundColor: hex }}
            />
          );
        })}
        {!planLimited ? (
          <label className="flex cursor-pointer items-center gap-1 text-[9px] text-wf-muted">
            <span>Pick</span>
            <input
              type="color"
              value={slide.backgroundColor?.startsWith("#") ? slide.backgroundColor : "#1e1b4b"}
              onChange={(e) =>
                onPatch({
                  backgroundColor: e.target.value,
                  backgroundUrl: undefined,
                  backgroundFullBleed: undefined,
                })
              }
              className="h-7 w-9 cursor-pointer rounded border border-white/15 bg-transparent"
            />
          </label>
        ) : null}
        {resetButton ? (
          <button
            type="button"
            onClick={resetButton.onClick}
            className="rounded-md border border-white/[0.12] px-2 py-1 text-[10px] text-wf-muted hover:text-wf-text"
          >
            {resetButton.label}
          </button>
        ) : null}
      </div>
      {!planLimited ? (
        <label className="block">
          <span className="text-[10px] text-wf-muted">Image URL (optional)</span>
          <input
            value={isDataUrlImage(slide.backgroundUrl) ? "" : (slide.backgroundUrl ?? "")}
            onChange={(e) => {
              const v = e.target.value.trim();
              onPatch({
                backgroundUrl: v || undefined,
                backgroundColor: v ? undefined : slide.backgroundColor,
                backgroundFullBleed: v ? slide.backgroundFullBleed : undefined,
              });
            }}
            placeholder="https://…"
            className="mt-0.5 h-8 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-2 font-mono text-[11px]"
          />
        </label>
      ) : null}
      {hasImageBg ? (
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/[0.06] bg-wf-bg/30 px-2 py-2">
          <input
            type="checkbox"
            checked={Boolean(slide.backgroundFullBleed)}
            onChange={(e) =>
              onPatch({
                backgroundFullBleed: e.target.checked ? true : undefined,
              })
            }
            className="mt-0.5 h-3.5 w-3.5 rounded border-white/25 accent-sky-600"
          />
          <span className="text-[10px] leading-snug text-wf-muted">
            <span className="font-medium text-wf-text/90">Designed graphic</span> — sharp background, no
            lyric blur (use for PNG/JPEG slides exported from PowerPoint or Keynote).
          </span>
        </label>
      ) : null}
    </div>
  );
}
