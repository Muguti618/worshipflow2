"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

type ReelFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
};

/**
 * Portrait 9:16 box (width/height = 9/16), centered on the highlight or viewport.
 */
function computeReelFrame(hole: Hole | null, vw: number, vh: number): ReelFrame {
  const margin = 32;
  if (vw < 1 || vh < 1) {
    return { left: 0, top: 0, width: 1, height: 1, cx: 0, cy: 0 };
  }

  if (!hole) {
    let fh = Math.min(vh * 0.92, (vw * 16) / 9);
    let fw = (fh * 9) / 16;
    if (fw > vw * 0.94) {
      fw = vw * 0.94;
      fh = (fw * 16) / 9;
    }
    const cx = vw / 2;
    const cy = vh / 2;
    let left = cx - fw / 2;
    let top = cy - fh / 2;
    left = Math.max(0, Math.min(vw - fw, left));
    top = Math.max(0, Math.min(vh - fh, top));
    return { left, top, width: fw, height: fh, cx, cy };
  }

  const cx = hole.left + hole.width / 2;
  const cy = hole.top + hole.height / 2;
  const iw = hole.width + margin * 2;
  const ih = hole.height + margin * 2;

  let fw = Math.max(iw, (ih * 9) / 16);
  let fh = (fw * 16) / 9;
  if (fh < ih) {
    fh = ih;
    fw = (fh * 9) / 16;
  }

  const maxW = vw * 0.96;
  const maxH = vh * 0.96;
  if (fw > maxW) {
    fw = maxW;
    fh = (fw * 16) / 9;
  }
  if (fh > maxH) {
    fh = maxH;
    fw = (fh * 9) / 16;
  }

  let left = cx - fw / 2;
  let top = cy - fh / 2;
  left = Math.max(0, Math.min(vw - fw, left));
  top = Math.max(0, Math.min(vh - fh, top));

  return {
    left,
    top,
    width: fw,
    height: fh,
    cx,
    cy,
  };
}

function applyReelTourDom(active: boolean) {
  const root = document.documentElement;
  if (!active) {
    root.removeAttribute("data-wf-reel-tour");
    return;
  }
  root.setAttribute("data-wf-reel-tour", "1");
}

export function MarketingReelTour() {
  const router = useRouter();
  const pathname = usePathname();
  const runLock = useRef(false);
  const [touring, setTouring] = useState(false);
  const [intro, setIntro] = useState(false);
  const [outro, setOutro] = useState(false);
  const [caption, setCaption] = useState("");
  const [hole, setHole] = useState<Hole | null>(null);
  const [reelFrame, setReelFrame] = useState<ReelFrame | null>(null);
  const [win, setWin] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const r = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    r();
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

  const refreshFrame = useCallback(
    (h: Hole | null) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const next = computeReelFrame(h, vw, vh);
      setReelFrame(next);
      return next;
    },
    [],
  );

  useLayoutEffect(() => {
    if (!touring) {
      setReelFrame(null);
      applyReelTourDom(false);
      return;
    }
    refreshFrame(hole);
    applyReelTourDom(true);
  }, [touring, hole, refreshFrame]);

  useEffect(() => {
    if (!touring) return;
    const onResize = () => {
      refreshFrame(hole);
      applyReelTourDom(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [touring, hole, refreshFrame]);

  const clearHole = useCallback(() => {
    setHole(null);
    setCaption("");
  }, []);

  const frameEl = useCallback(
    async (el: HTMLElement, text: string, holdMs: number, reduced: boolean) => {
      el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      await sleep(reduced ? 60 : 480);
      await new Promise(requestAnimationFrame);
      const h = padRect(el, 14);
      setHole(h);
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

  const vw = win.w || (typeof window !== "undefined" ? window.innerWidth : 0);
  const vh = win.h || (typeof window !== "undefined" ? window.innerHeight : 0);

  const frame =
    touring && !intro && !outro && reelFrame && reelFrame.width > 2
      ? reelFrame
      : touring && !intro && !outro && vw > 0
        ? computeReelFrame(null, vw, vh)
        : null;

  const holeRight = hole ? hole.left + hole.width : 0;
  const holeBottom = hole ? hole.top + hole.height : 0;
  const captionBottom =
    frame && vh > 0 ? Math.max(12, vh - frame.top - frame.height + 14) : 12;

  return (
    <>
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
            The bright 9:16 window tracks each highlight — crop that area for TikTok, Reels, and Shorts. The
            app scales slightly so more fits in frame.
          </p>
        </div>
      ) : null}

      {outro ? (
        <div className="fixed inset-0 z-[62] flex flex-col items-center justify-center bg-gradient-to-t from-sky-950/90 via-[#070b12] to-black/95 px-5 text-center">
          <p className="text-base font-semibold text-white sm:text-lg">Export vertical</p>
          <p className="mt-2 max-w-xs text-sm text-sky-100/80">
            Use the moving bright frame from your recording — ready for TikTok, Instagram Reels, and
            Facebook Reels.
          </p>
          <p className="mt-10 text-[10px] uppercase tracking-[0.28em] text-white/35">worshipflow2</p>
        </div>
      ) : null}

      {touring && frame && !intro && !outro ? (
        <div className="pointer-events-none fixed inset-0 z-[55]" aria-hidden>
          <div
            className="absolute bg-[rgba(2,4,10,0.88)] backdrop-blur-[0.5px]"
            style={{ top: 0, left: 0, right: 0, height: frame.top }}
          />
          <div
            className="absolute bg-[rgba(2,4,10,0.88)] backdrop-blur-[0.5px]"
            style={{
              top: frame.top + frame.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className="absolute bg-[rgba(2,4,10,0.88)] backdrop-blur-[0.5px]"
            style={{ top: frame.top, left: 0, width: frame.left, height: frame.height }}
          />
          <div
            className="absolute bg-[rgba(2,4,10,0.88)] backdrop-blur-[0.5px]"
            style={{
              top: frame.top,
              left: frame.left + frame.width,
              right: 0,
              height: frame.height,
            }}
          />
          <div
            className="absolute box-border border border-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
            style={{
              top: frame.top,
              left: frame.left,
              width: frame.width,
              height: frame.height,
              borderRadius: 12,
            }}
          />

          {hole ? (
            <>
              <div
                className="absolute bg-[rgba(3,5,12,0.72)]"
                style={{
                  top: frame.top,
                  left: frame.left,
                  width: frame.width,
                  height: Math.max(0, hole.top - frame.top),
                }}
              />
              <div
                className="absolute bg-[rgba(3,5,12,0.72)]"
                style={{
                  top: holeBottom,
                  left: frame.left,
                  width: frame.width,
                  height: Math.max(0, frame.top + frame.height - holeBottom),
                }}
              />
              <div
                className="absolute bg-[rgba(3,5,12,0.72)]"
                style={{
                  top: hole.top,
                  left: frame.left,
                  width: Math.max(0, hole.left - frame.left),
                  height: hole.height,
                }}
              />
              <div
                className="absolute bg-[rgba(3,5,12,0.72)]"
                style={{
                  top: hole.top,
                  left: holeRight,
                  width: Math.max(0, frame.left + frame.width - holeRight),
                  height: hole.height,
                }}
              />
              <div
                className="pointer-events-none absolute box-border border-2 border-sky-400/55 shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_0_36px_rgba(56,189,248,0.18)] transition-all duration-[0.85s] ease-out"
                style={{
                  top: hole.top,
                  left: hole.left,
                  width: hole.width,
                  height: hole.height,
                  borderRadius: hole.r,
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {caption && frame && touring && !intro && !outro ? (
        <div
          className="pointer-events-none fixed z-[59] px-2"
          style={{
            left: frame.left + 10,
            width: frame.width - 20,
            bottom: captionBottom,
          }}
        >
          <p className="rounded-2xl border border-white/14 bg-zinc-950/90 px-3 py-2.5 text-center text-[12px] font-medium leading-snug text-white/95 shadow-lg shadow-black/50 backdrop-blur-md sm:text-[13px]">
            {caption}
          </p>
        </div>
      ) : null}
    </>
  );
}
