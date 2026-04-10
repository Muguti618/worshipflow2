"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  reelDirectorHotkeySafeTarget,
  WF_REEL_OPEN_NEW_SONG,
  WF_REEL_WIZARD_CONFIRM_SONG,
  WF_REEL_WIZARD_SAMPLE_LYRICS,
} from "@/lib/wf-reel-director";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isVisible(el: HTMLElement) {
  if (!el.isConnected) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

async function waitForSelector(selector: string, timeoutMs = 14000): Promise<HTMLElement | null> {
  const t0 = performance.now();
  while (performance.now() - t0 < timeoutMs) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el && isVisible(el)) return el;
    await new Promise(requestAnimationFrame);
  }
  return null;
}

async function waitForPathMatch(match: (path: string) => boolean, timeoutMs = 12000) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeoutMs) {
    if (match(window.location.pathname)) return;
    await sleep(40);
  }
}

type Hole = { top: number; left: number; width: number; height: number; r: number };

function padRect(el: HTMLElement, pad: number): Hole {
  const b = el.getBoundingClientRect();
  const top = Math.max(8, b.top - pad);
  const left = Math.max(8, b.left - pad);
  const width = Math.min(window.innerWidth - left - 8, b.width + pad * 2);
  const height = Math.min(window.innerHeight - top - 8, b.height + pad * 2);
  return { top, left, width, height, r: 14 };
}

export function ReelDirector() {
  const router = useRouter();
  const pathname = usePathname();
  const runningRef = useRef(false);
  const [curtain, setCurtain] = useState(false);
  const [outro, setOutro] = useState(false);
  const [letterbox, setLetterbox] = useState(false);
  const [caption, setCaption] = useState("");
  const [hole, setHole] = useState<Hole | null>(null);

  const clearFraming = useCallback(() => {
    setHole(null);
    setCaption("");
  }, []);

  const frameEl = useCallback(
    async (el: HTMLElement, text: string, holdMs: number) => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(520);
      setHole(padRect(el, 14));
      setCaption(text);
      await sleep(Math.max(800, holdMs));
      clearFraming();
      await sleep(280);
    },
    [clearFraming],
  );

  const tryFrame = useCallback(
    async (selector: string, text: string, holdMs: number) => {
      const el = await waitForSelector(selector, 2200);
      if (!el) {
        await sleep(350);
        return;
      }
      await frameEl(el, text, holdMs);
    },
    [frameEl],
  );

  const run = useCallback(async () => {
    if (runningRef.current) return;
    if (typeof window === "undefined") return;
    runningRef.current = true;
    setLetterbox(true);
    setCurtain(true);
    clearFraming();

    try {
      await sleep(2600);
      setCurtain(false);
      await sleep(320);

      const goDash = !pathname.startsWith("/dashboard");
      if (goDash) {
        router.push("/dashboard");
        await waitForPathMatch((p) => p === "/dashboard" || p.startsWith("/dashboard/"));
        await sleep(450);
      }

      await tryFrame('[data-wf-reel="dash-stage"]', "Live stage preview — same look as Present", 2800);
      await tryFrame("#wf-dash-setlist", "One setlist drives the whole service", 2200);
      await tryFrame('[data-wf-tour="tour-dash-new-setlist"]', "Spin up a new order anytime", 1900);
      await tryFrame('[data-wf-tour="tour-dash-present"]', "Presenter opens in a clean window", 2000);

      router.push("/songs");
      await waitForPathMatch((p) => p === "/songs" || p.startsWith("/songs/"));
      await sleep(500);
      window.dispatchEvent(new Event(WF_REEL_OPEN_NEW_SONG));
      const wizard = await waitForSelector('[data-wf-reel="song-wizard-root"]', 8000);
      if (wizard) {
        await sleep(200);
        window.dispatchEvent(new Event(WF_REEL_WIZARD_SAMPLE_LYRICS));
        await sleep(480);
        window.dispatchEvent(new Event(WF_REEL_WIZARD_CONFIRM_SONG));
        await sleep(1100);
      }

      router.push("/bible");
      await waitForPathMatch((p) => p === "/bible" || p.startsWith("/bible/"));
      await sleep(500);
      await tryFrame('[data-wf-reel="bible-lookup"]', "References + AI ideas, in one place", 2100);
      await tryFrame('[data-wf-reel="bible-passage"]', "Readable passage block", 2400);
      await tryFrame('[data-wf-reel="bible-slide-strip"]', "Auto slide strips for the deck", 2200);

      router.push("/setlists");
      await waitForPathMatch((p) => p === "/setlists" || p.startsWith("/setlists/"));
      await sleep(450);
      await tryFrame('[data-wf-tour="tour-setlists-new"]', "Arrange songs, slides, scripture", 2200);

      setOutro(true);
      clearFraming();
      await sleep(2800);
      setOutro(false);
    } finally {
      runningRef.current = false;
      setLetterbox(false);
      clearFraming();
    }
  }, [clearFraming, pathname, router, tryFrame]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.altKey || e.key.toLowerCase() !== "r") return;
      if (!reelDirectorHotkeySafeTarget(e.target)) return;
      e.preventDefault();
      void run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  const v = "8vh";

  return (
    <>
      {letterbox ? (
        <>
          <div
            className="pointer-events-none fixed left-0 right-0 top-0 z-[58] bg-black/88"
            style={{ height: v }}
            aria-hidden
          />
          <div
            className="pointer-events-none fixed bottom-0 left-0 right-0 z-[58] bg-black/88"
            style={{ height: v }}
            aria-hidden
          />
        </>
      ) : null}

      {curtain ? (
        <div
          className="fixed inset-0 z-[62] flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1030] via-[#0c1220] to-[#050810] px-6 text-center"
          aria-live="polite"
        >
          <p className="wf-reel-curtain-kicker text-[11px] font-semibold uppercase tracking-[0.35em] text-violet-300/80">
            Reel director
          </p>
          <h1 className="wf-reel-curtain-title mt-5 max-w-lg text-balance font-semibold tracking-tight text-white">
            Their eyes on the screen.
            <span className="mt-3 block text-violet-200/95">Your mind on the moment.</span>
          </h1>
          <p className="mt-8 text-sm text-white/45">worshipflow2</p>
        </div>
      ) : null}

      {outro ? (
        <div className="fixed inset-0 z-[62] flex flex-col items-center justify-center bg-gradient-to-t from-violet-950/95 via-[#0a0e16] to-black/90 px-6 text-center">
          <p className="text-lg font-semibold text-white/95">Plan in the browser.</p>
          <p className="mt-2 text-sm text-violet-200/85">Present with calm.</p>
          <p className="mt-10 text-xs uppercase tracking-[0.25em] text-white/40">worshipflow2</p>
        </div>
      ) : null}

      {hole ? (
        <div className="pointer-events-none fixed inset-0 z-[56]" aria-hidden>
          <div
            className="absolute bg-[rgba(4,6,14,0.92)] transition-opacity duration-500"
            style={{ top: 0, left: 0, right: 0, height: hole.top }}
          />
          <div
            className="absolute bg-[rgba(4,6,14,0.92)] transition-opacity duration-500"
            style={{
              top: hole.top + hole.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className="absolute bg-[rgba(4,6,14,0.92)] transition-opacity duration-500"
            style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }}
          />
          <div
            className="absolute bg-[rgba(4,6,14,0.92)] transition-opacity duration-500"
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              right: 0,
              height: hole.height,
            }}
          />
          <div
            className="pointer-events-none absolute box-border border-2 border-violet-400/55 shadow-[0_0_0_1px_rgba(167,139,250,0.2),0_0_48px_rgba(139,92,246,0.25)] transition-all duration-[1.05s] ease-out"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              borderRadius: hole.r,
            }}
          />
        </div>
      ) : null}

      {caption ? (
        <div className="pointer-events-none fixed bottom-[max(1.25rem,10vh)] left-1/2 z-[59] w-[min(92vw,28rem)] -translate-x-1/2 px-3">
          <p className="rounded-2xl border border-violet-400/25 bg-violet-950/82 px-4 py-3 text-center text-sm font-medium leading-snug text-violet-50/95 shadow-lg shadow-black/40 backdrop-blur-md">
            {caption}
          </p>
        </div>
      ) : null}
    </>
  );
}
