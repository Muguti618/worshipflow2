"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyWfTheme,
  getStoredWfTheme,
  persistWfTheme,
  type WfTheme,
} from "@/lib/theme-preference";

const STORAGE_EVENT = "wf-theme-change";

export function dispatchWfThemeChange(theme: WfTheme): void {
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: theme }));
}

export function AppearanceSettings() {
  const [theme, setTheme] = useState<WfTheme>("dark");

  useEffect(() => {
    setTheme(getStoredWfTheme());
  }, []);

  useEffect(() => {
    const sync = () => setTheme(getStoredWfTheme());
    const onCustom = (e: Event) => {
      const t = (e as CustomEvent<WfTheme>).detail;
      if (t === "light" || t === "dark") setTheme(t);
    };
    window.addEventListener("storage", sync);
    window.addEventListener(STORAGE_EVENT, onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(STORAGE_EVENT, onCustom as EventListener);
    };
  }, []);

  const choose = useCallback((next: WfTheme) => {
    setTheme(next);
    persistWfTheme(next);
    dispatchWfThemeChange(next);
  }, []);

  return (
    <section className="rounded-[18px] border border-wf-border bg-wf-card/40 p-6 backdrop-blur-md">
      <h2 className="text-sm font-semibold text-wf-text">Appearance</h2>
      <p className="mt-1 text-xs leading-relaxed text-wf-muted">
        Light mode updates the dashboard, songs, setlists, and other main screens. Presenter and
        audience views stay optimized for dark rooms.
      </p>
      <fieldset className="mt-4">
        <legend className="sr-only">Colour theme</legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-[12px] border border-wf-border bg-wf-bg/50 px-4 py-3 has-[:checked]:border-sky-500/35 has-[:checked]:bg-white/[0.04]">
            <input
              type="radio"
              name="wf-theme"
              checked={theme === "dark"}
              onChange={() => choose("dark")}
              className="h-4 w-4 accent-sky-600"
            />
            <span className="text-sm font-medium text-wf-text">Dark</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-[12px] border border-wf-border bg-wf-bg/50 px-4 py-3 has-[:checked]:border-sky-500/35 has-[:checked]:bg-white/[0.04]">
            <input
              type="radio"
              name="wf-theme"
              checked={theme === "light"}
              onChange={() => choose("light")}
              className="h-4 w-4 accent-sky-600"
            />
            <span className="text-sm font-medium text-wf-text">Light</span>
          </label>
        </div>
      </fieldset>
      <button
        type="button"
        onClick={() => {
          persistWfTheme("dark");
          setTheme("dark");
          dispatchWfThemeChange("dark");
        }}
        className="mt-4 text-left text-[11px] font-medium text-wf-muted underline-offset-2 hover:text-wf-text hover:underline"
      >
        Reset appearance to dark theme
      </button>
    </section>
  );
}

/** Call on app mount so SSR and first client paint match storage (optional if script runs first). */
export function syncWfThemeFromStorage(): void {
  applyWfTheme(getStoredWfTheme());
}
