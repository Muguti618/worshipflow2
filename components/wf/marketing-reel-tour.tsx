"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MARKETING_REEL_HOTKEY_HINT,
  marketingReelHotkeySafeTarget,
  WF_MARKETING_OPEN_NEW_SONG,
  WF_MARKETING_WIZARD_CONFIRM,
  WF_MARKETING_WIZARD_SAMPLE,
} from "@/lib/wf-marketing-reel";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isVisible(el: HTMLElement) {
  return el.isConnected && el.getBoundingClientRect().width > 0;
}

async function waitForSelector(selector: string, timeoutMs = 12000): Promise<HTMLElement | null> {
  const t0 = performance.now();
  while (performance.now() - t0 < timeoutMs) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el && isVisible(el)) return el;
    await new Promise(requestAnimationFrame);
  }
  return null;
}

async function waitPath(match: (p: string) => boolean, timeoutMs = 12000) {
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
  return { top, left, width, height, r: 16 };
}

function pillarWidthPx(): number {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const col = Math.min(vw, (vh * 9) / 16);
  return Math.max(0, (vw - col) / 2);
}

export function MarketingReelTour() {
  const router = useRouter();
  const pathname = usePathname();
  const runLock = useRef(false);
  const [touring, setTouring] = useState(false);
  const [intro, setIntro] = useState(false);
  const [outro, setOutro] = useState(false);
  const [sidePad, setSidePad] = useState(0);
  const [caption, setCaption] = useState("");
  const [hole, setHole] = useState<Hole | null>(null);

  const clearHole = useCallback(() => {
    setHole(null);
    setCaption("");
  }, []);

  useEffect(() => {
    if (!touring) {
      setSidePad(0);
      return;
    }
    const sync = () => setSidePad(pillarWidthPx());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [touring]);

  const frameEl = useCallback(
    async (el: HTMLElement, text: string, holdMs: number, reduced: boolean) => {
      el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      await sleep(reduced ? 60 : 440);
      setHole(padRect(el, 12));
      setCaption(text);
      await sleep(Math.max(520, reduced ? holdMs * 0.55 : holdMs));
      clearHole();
      await sleep(reduced ? 100 : 220);
    },
    [clearHole],
  );

  const tryFrame = useCallback(
    async (sel: string, text: string, hold: number, reduced: boolean) => {
      const el = await waitForSelector(sel, 2400);
      if (!el) {
        await sleep(280);
        return;
      }
      await frameEl(el, text, hold, reduced);
    },
    [frameEl],
  );

  const run = useCallback(async () => {
    if (runLock.current) return;
    runLock.current = true;
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setTouring(true);
    clearHole();
    try {
      setIntro(true);
      await sleep(reduced ? 900 : 2600);
      setIntro(false);
      await sleep(reduced ? 120 : 280);

      const goDash = !pathname.startsWith("/dashboard");
      if (goDash) {
        router.push("/dashboard");
        await waitPath((p) => p === "/dashboard");
        await sleep(420);
      }

      await tryFrame(
        '[data-wf-reel="reel-dash-stage"]',
        "Stage preview — what the room sees",
        reduced ? 1700 : 2600,
        reduced,
      );
      await tryFrame("#wf-dash-setlist", "Pick the setlist for tonight", reduced ? 1300 : 2100, reduced);
      await tryFrame(
        '[data-wf-tour="tour-dash-new-setlist"]',
        "Build a new flow anytime",
        reduced ? 1100 : 1750,
        reduced,
      );
      await tryFrame(
        '[data-wf-tour="tour-dash-present"]',
        "Open presenter when you’re ready",
        reduced ? 1200 : 1900,
        reduced,
      );

      router.push("/songs");
      await waitPath((p) => p === "/songs" || p.startsWith("/songs/"));
      await sleep(480);
      window.dispatchEvent(new Event(WF_MARKETING_OPEN_NEW_SONG));
      const wiz = await waitForSelector('[data-wf-reel="reel-wizard-root"]', 8000);
      if (wiz) {
        await sleep(220);
        window.dispatchEvent(new Event(WF_MARKETING_WIZARD_SAMPLE));
        await sleep(reduced ? 300 : 520);
        window.dispatchEvent(new Event(WF_MARKETING_WIZARD_CONFIRM));
        await sleep(reduced ? 600 : 1100);
      }

      router.push("/bible");
      await waitPath((p) => p === "/bible");
      await sleep(420);
      await tryFrame(
        '[data-wf-reel="reel-bible-panel"]',
        "Look up verses + AI ideas on a theme",
        reduced ? 1500 : 2200,
        reduced,
      );
      await tryFrame(
        '[data-wf-reel="reel-bible-passage"]',
        "Big, readable passage text",
        reduced ? 1300 : 2100,
        reduced,
      );
      await tryFrame(
        '[data-wf-reel="reel-bible-slides"]',
        "Slide strips for the deck",
        reduced ? 1300 : 2000,
        reduced,
      );

      router.push("/setlists");
      await waitPath((p) => p === "/setlists" || p.startsWith("/setlists/"));
      await sleep(380);
      await tryFrame(
        '[data-wf-tour="tour-setlists-new"]',
        "Arrange songs, slides & scripture",
        reduced ? 1300 : 2100,
        reduced,
      );

      setOutro(true);
      clearHole();
      await sleep(reduced ? 1500 : 2800);
      setOutro(false);
    } finally {
      runLock.current = false;
      setTouring(false);
      clearHole();
    }
  }, [clearHole, pathname, router, tryFrame]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.altKey || e.key.toLowerCase() !== "m") return;
      if (!marketingReelHotkeySafeTarget(e.target)) return;
      e.preventDefault();
      void run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  return (
    <>
      {touring && sidePad > 6 ? (
        <>
          <div
            className="pointer-events-none fixed inset-y-0 left-0 z-[55] bg-black/[0.82] backdrop-blur-[1px]"
            style={{ width: sidePad }}
            aria-hidden
          />
          <div
            className="pointer-events-none fixed inset-y-0 right-0 z-[55] bg-black/[0.82] backdrop-blur-[1px]"
            style={{ width: sidePad }}
            aria-hidden
          />
        </>
      ) : null}

      {!touring ? (
        <button
          type="button"
          className="wf-marketing-reel-fab fixed z-[61] max-w-[min(92vw,15rem)] touch-manipulation rounded-2xl border border-violet-400/35 bg-zinc-950/92 px-3.5 py-2.5 text-left shadow-xl shadow-black/50 backdrop-blur-md transition hover:border-sky-400/40 hover:bg-zinc-900/95 bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] sm:bottom-6 sm:right-6"
          onClick={() => void run()}
          title={`Marketing reel tour — ${MARKETING_REEL_HOTKEY_HINT}`}
        >
          <span className="block text-xs font-semibold tracking-tight text-white">Reel tour</span>
          <span className="mt-0.5 block text-[10px] leading-snug text-violet-200/85">
            Social demo · {MARKETING_REEL_HOTKEY_HINT}
          </span>
        </button>
      ) : null}

      {intro ? (
        <div
          className="fixed inset-0 z-[62] flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950 via-[#0a0f18] to-black px-5 text-center"
          aria-live="polite"
        >
          <p className="wf-mreel-kicker text-[10px] font-semibold uppercase tracking-[0.38em] text-sky-300/85">
            worshipflow2
          </p>
          <h1 className="wf-mreel-title mt-5 max-w-md text-balance text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
            Plan worship.
            <span className="mt-2 block text-sky-100/95">Present with calm.</span>
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/50">
            Side bars show a 9:16 crop — resize or record the center for TikTok, Reels, and Shorts.
          </p>
        </div>
      ) : null}

      {outro ? (
        <div className="fixed inset-0 z-[62] flex flex-col items-center justify-center bg-gradient-to-t from-sky-950/90 via-[#070b12] to-black/95 px-5 text-center">
          <p className="text-base font-semibold text-white sm:text-lg">Export vertical</p>
          <p className="mt-2 max-w-xs text-sm text-sky-100/80">
            Crop to the bright center column — ready for TikTok, Instagram Reels, and Facebook Reels.
          </p>
          <p className="mt-10 text-[10px] uppercase tracking-[0.28em] text-white/35">worshipflow2</p>
        </div>
      ) : null}

      {hole ? (
        <div className="pointer-events-none fixed inset-0 z-[56]" aria-hidden>
          <div
            className="absolute bg-[rgba(3,5,12,0.9)]"
            style={{ top: 0, left: 0, right: 0, height: hole.top }}
          />
          <div
            className="absolute bg-[rgba(3,5,12,0.9)]"
            style={{
              top: hole.top + hole.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className="absolute bg-[rgba(3,5,12,0.9)]"
            style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }}
          />
          <div
            className="absolute bg-[rgba(3,5,12,0.9)]"
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              right: 0,
              height: hole.height,
            }}
          />
          <div
            className="pointer-events-none absolute box-border border-2 border-sky-400/50 shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_0_42px_rgba(56,189,248,0.2)] transition-all duration-[0.95s] ease-out"
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
        <div className="pointer-events-none fixed bottom-[max(1rem,12vh)] left-1/2 z-[59] w-[min(90vw,min(100vw,calc(100dvh*9/16))-1rem)] -translate-x-1/2 px-2 sm:bottom-[max(1.25rem,14vh)]">
          <p className="rounded-2xl border border-white/12 bg-zinc-950/88 px-3 py-2.5 text-center text-[13px] font-medium leading-snug text-white/95 shadow-lg shadow-black/45 backdrop-blur-md sm:px-4 sm:text-sm">
            {caption}
          </p>
        </div>
      ) : null}
    </>
  );
}
