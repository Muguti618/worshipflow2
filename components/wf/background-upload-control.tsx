"use client";

import { useId, useRef, useState } from "react";
import { readImageFileAsDataUrl } from "@/lib/read-image-data-url";

type Props = {
  onDataUrl: (dataUrl: string) => void;
  /** Square control matching preset thumbnails */
  variant?: "tile" | "button";
  /** Highlight when this song/block uses an uploaded image */
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
  tileClassName?: string;
};

export function BackgroundUploadControl({
  onDataUrl,
  variant = "button",
  isActive = false,
  disabled = false,
  className = "",
  tileClassName = "",
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    setError(null);
    inputRef.current?.click();
  };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      onDataUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use this image.");
    }
  };

  const input = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      accept="image/*"
      className="sr-only"
      onChange={(e) => void onChange(e)}
      disabled={disabled}
    />
  );

  if (variant === "tile") {
    return (
      <div className={`flex flex-col ${className}`}>
        {input}
        <button
          type="button"
          title="Upload your own background image"
          disabled={disabled}
          onClick={openPicker}
          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border-2 text-[9px] font-bold uppercase leading-none tracking-tight transition disabled:opacity-40 ${
            isActive
              ? "border-sky-500/40 bg-sky-500/12 text-slate-100 ring-2 ring-sky-500/30"
              : "border-dashed border-white/25 bg-white/[0.04] text-white/55 hover:border-sky-400/45 hover:bg-white/[0.05] hover:text-slate-100"
          } ${tileClassName}`}
        >
          <span className="text-base font-light leading-none" aria-hidden>
            +
          </span>
          Yours
        </button>
        {error ? (
          <p className="mt-1 max-w-[11rem] text-[10px] leading-snug text-red-300/95">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      {input}
      <button
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className="rounded-lg border border-dashed border-white/20 bg-white/[0.04] px-3 py-2 text-xs font-medium text-wf-muted transition hover:border-white/18 hover:bg-white/[0.05] hover:text-wf-text disabled:opacity-40"
      >
        Upload from device
      </button>
      <p className="mt-1 text-[9px] leading-snug text-wf-muted">
        JPEG, PNG, WebP… max ~2.5 MB. Stored in this browser only.
      </p>
      {error ? <p className="mt-1 text-[11px] text-red-300/95">{error}</p> : null}
    </div>
  );
}
