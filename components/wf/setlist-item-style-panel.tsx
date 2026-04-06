"use client";

import { BackgroundUploadControl } from "@/components/wf/background-upload-control";
import { BACKGROUND_PRESETS, BACKGROUND_SOLID_SWATCHES } from "@/lib/background-presets";
import { isDataUrlImage } from "@/lib/read-image-data-url";
import {
  FREE_BACKGROUND_PRESET_IDS,
  FREE_SOLID_SWATCH_COUNT,
} from "@/lib/plan-limits";
import type { SlideTypography } from "@/lib/setlists-catalog";

type BlockStylePatch = {
  itemBackgroundUrl?: string;
  itemBackgroundColor?: string;
  itemTypography?: SlideTypography;
};

export function SetlistItemStylePanel(props: {
  title?: string;
  itemBackgroundUrl?: string;
  itemBackgroundColor?: string;
  itemTypography?: SlideTypography;
  onPatch: (patch: BlockStylePatch) => void;
  /** Smaller label for nested “this slide only” */
  compact?: boolean;
  planLimited?: boolean;
}) {
  const {
    title = "Look for this block (all slides)",
    itemBackgroundUrl,
    itemBackgroundColor,
    itemTypography,
    onPatch,
    compact,
    planLimited = false,
  } = props;

  const freeIds = new Set<string>(FREE_BACKGROUND_PRESET_IDS);
  const presetList = planLimited
    ? BACKGROUND_PRESETS.filter((p) => freeIds.has(p.id))
    : BACKGROUND_PRESETS;
  const solidList = planLimited
    ? BACKGROUND_SOLID_SWATCHES.slice(0, FREE_SOLID_SWATCH_COUNT)
    : [...BACKGROUND_SOLID_SWATCHES];

  const hasImageBg = Boolean(itemBackgroundUrl?.trim() && !itemBackgroundColor?.trim());

  return (
    <div
      className={`rounded-xl border border-white/[0.06] bg-wf-bg/25 p-3 ${
        compact ? "mt-2" : "mt-4"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-wf-muted">{title}</p>
      <label className="mt-2 block">
        <span className="text-[10px] text-wf-muted">Font style</span>
        <select
          value={itemTypography ?? "editorial"}
          onChange={(e) =>
            onPatch({ itemTypography: e.target.value as SlideTypography })
          }
          className="mt-0.5 h-9 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-2 text-xs"
        >
          <option value="editorial">Editorial (lighter)</option>
          <option value="default">Bold / default</option>
        </select>
      </label>
      {planLimited ? (
        <p className="mt-3 text-[10px] leading-snug text-amber-200/80">
          Free plan: core presets and a few colours for this block.
        </p>
      ) : null}
      <p className="mt-3 text-[10px] text-wf-muted">Background image (presets)</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {presetList.map((p) => {
          const on = hasImageBg && itemBackgroundUrl === p.url;
          return (
            <button
              key={p.id}
              type="button"
              title={p.label}
              onClick={() =>
                onPatch({
                  itemBackgroundUrl: p.url,
                  itemBackgroundColor: undefined,
                })
              }
              className={`h-10 w-10 overflow-hidden rounded-lg border-2 transition ${
                on ? "border-violet-400 ring-2 ring-violet-500/30" : "border-white/10"
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
            isActive={hasImageBg && isDataUrlImage(itemBackgroundUrl)}
            onDataUrl={(u) =>
              onPatch({
                itemBackgroundUrl: u,
                itemBackgroundColor: undefined,
              })
            }
          />
        ) : null}
      </div>
      <p className="mt-3 text-[10px] text-wf-muted">Solid colour</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {solidList.map((hex) => {
          const on = itemBackgroundColor === hex && !itemBackgroundUrl?.trim();
          return (
            <button
              key={hex}
              type="button"
              onClick={() =>
                onPatch({
                  itemBackgroundColor: hex,
                  itemBackgroundUrl: undefined,
                })
              }
              className={`h-8 w-8 rounded-lg border-2 ${
                on ? "border-violet-400 ring-2 ring-violet-500/30" : "border-white/15"
              }`}
              style={{ backgroundColor: hex }}
              title={hex}
            />
          );
        })}
        {!planLimited ? (
          <label className="ml-1 flex cursor-pointer items-center gap-1 text-[10px] text-wf-muted">
            <span>Pick</span>
            <input
              type="color"
              value={
                itemBackgroundColor?.startsWith("#") ? itemBackgroundColor : "#1e1b4b"
              }
              onChange={(e) =>
                onPatch({
                  itemBackgroundColor: e.target.value,
                  itemBackgroundUrl: undefined,
                })
              }
              className="h-8 w-10 cursor-pointer rounded border border-white/15 bg-transparent"
            />
          </label>
        ) : null}
      </div>
      {!planLimited ? (
        <label className="mt-3 block">
          <span className="text-[10px] text-wf-muted">Custom image URL</span>
          <input
            value={isDataUrlImage(itemBackgroundUrl) ? "" : (itemBackgroundUrl ?? "")}
            onChange={(e) => {
              const v = e.target.value.trim();
              onPatch({
                itemBackgroundUrl: v || undefined,
                itemBackgroundColor: v ? undefined : itemBackgroundColor,
              });
            }}
            placeholder="https://… or upload above"
            className="mt-0.5 h-8 w-full rounded-lg border border-white/[0.08] bg-wf-bg/60 px-2 font-mono text-[11px]"
          />
        </label>
      ) : null}
      <button
        type="button"
        onClick={() =>
          onPatch({
            itemBackgroundUrl: undefined,
            itemBackgroundColor: undefined,
          })
        }
        className="mt-2 text-[11px] font-medium text-wf-muted hover:text-wf-text"
      >
        Reset block background (use presenter default)
      </button>
    </div>
  );
}
