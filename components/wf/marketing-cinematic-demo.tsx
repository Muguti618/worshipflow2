"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  broadcastDeckUpdated,
  broadcastSlideReset,
  DEFAULT_PRESENT_ROOM,
  postPresenterSlide,
  writeActiveDeck,
} from "@/lib/active-deck";
import { flattenSetlistToDeck } from "@/lib/setlist-flatten";
import { getSetlistById } from "@/lib/setlists-resolve";
import {
  marketingDemoHotkeySafeTarget,
  WF_MARKETING_FILL_WAY_MAKER,
  WF_MARKETING_OPEN_NEW_SONG,
  WF_MARKETING_REEL_CONFIRM_MANUAL_SONG,
  WF_MARKETING_REEL_CREATE_SETLIST,
} from "@/lib/wf-marketing-demo";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Scroll settle + CSS spotlight transition — keep in sync with spotlight `duration-*` class. */
const CAM_SCROLL_SETTLE_MS = 1100;
const CAM_WIDE_PAD = 80;
const CAM_TIGHT_PAD = 8;
const CAM_ESTABLISH_WIDE_MS = 550;
const CAM_ZOOM_TRANSITION_MS = 1900;
const SPOTLIGHT_TRANSITION_MS = 1900;

async function waitForSelector(selector: string, timeoutMs = 8000): Promise<HTMLElement | null> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) return el;
    await sleep(40);
  }
  return null;
}

async function waitUntilGone(selector: string, timeoutMs = 12000): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (!document.querySelector(selector)) return;
    await sleep(45);
  }
}

async function waitForUrlPath(match: (path: string) => boolean, timeoutMs = 14000): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (match(window.location.pathname)) return true;
    await sleep(45);
  }
  return false;
}

async function pushReelDeckToPresenterWhenReady(
  setlistId: string,
  bail: () => boolean,
): Promise<void> {
  const deadline = Date.now() + 9000;
  while (Date.now() < deadline && !bail()) {
    const def = getSetlistById(setlistId);
    if (def?.items.some((it) => it.id.includes("-wf-reel-"))) {
      writeActiveDeck(flattenSetlistToDeck(def.items), setlistId);
      broadcastDeckUpdated();
      broadcastSlideReset(DEFAULT_PRESENT_ROOM);
      void postPresenterSlide(DEFAULT_PRESENT_ROOM, 0);
      return;
    }
    await sleep(90);
  }
  if (bail()) return;
  const def = getSetlistById(setlistId);
  if (def && def.items.length > 0) {
    writeActiveDeck(flattenSetlistToDeck(def.items), setlistId);
    broadcastDeckUpdated();
    broadcastSlideReset(DEFAULT_PRESENT_ROOM);
    void postPresenterSlide(DEFAULT_PRESENT_ROOM, 0);
  }
}

type SpotBox = { top: number; left: number; width: number; height: number };

function measureBox(el: Element | null, pad: number): SpotBox | null {
  if (!el || !(el instanceof HTMLElement)) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return {
    top: r.top - pad,
    left: r.left - pad,
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  };
}

type DemoPhase = "idle" | "running" | "outro";

export function MarketingCinematicDemo() {
  const router = useRouter();
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [spotlight, setSpotlight] = useState<SpotBox | null>(null);
  const [caption, setCaption] = useState("");
  const [introTitle, setIntroTitle] = useState<string | null>(null);
  const runningRef = useRef(false);
  const armCtrlARef = useRef(0);

  const runDemo = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("running");
    setCaption("");
    setSpotlight(null);

    const bail = () => !runningRef.current;

    /**
     * “Camera” beat: scroll, wide establishing hole, then ease into a tight frame on the subject.
     */
    const cameraFrame = async (el: HTMLElement | null, cap: string, holdOnSubjectMs: number) => {
      if (bail() || !el) return;
      setCaption(cap);
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(CAM_SCROLL_SETTLE_MS);
      if (bail()) return;
      const wide = measureBox(el, CAM_WIDE_PAD);
      const tight = measureBox(el, CAM_TIGHT_PAD);
      if (!wide || !tight) return;
      setSpotlight(wide);
      await sleep(CAM_ESTABLISH_WIDE_MS);
      if (bail()) return;
      setSpotlight(tight);
      await sleep(CAM_ZOOM_TRANSITION_MS + 250);
      if (bail()) return;
      await sleep(holdOnSubjectMs);
    };

    const scrollAndFrame = async (selector: string, cap: string, holdMs: number) => {
      if (bail()) return;
      const el = await waitForSelector(selector);
      if (bail()) return;
      await cameraFrame(el, cap, holdMs);
    };

    try {
      setIntroTitle("WorshipFlow2");
      await sleep(3000);
      if (bail()) return;
      setIntroTitle(null);
      await sleep(450);
      if (bail()) return;

      await scrollAndFrame('[data-wf-tour="tour-nav-songs"]', "Song library — every title, ready for Sunday", 3200);
      if (bail()) return;

      router.push("/songs");
      await waitForSelector('[data-wf-tour="tour-songs-new"]');
      if (bail()) return;
      await sleep(1000);
      if (bail()) return;

      await scrollAndFrame('[data-wf-tour="tour-songs-new"]', "Add a song — one flow, many slides", 2800);
      if (bail()) return;

      window.dispatchEvent(new Event(WF_MARKETING_OPEN_NEW_SONG));
      await waitForSelector('[data-wf-demo="wizard-shell"]');
      if (bail()) return;
      await sleep(850);
      if (bail()) return;

      await scrollAndFrame('[data-wf-demo="wizard-shell"]', "Manual or AI — your licensed lyrics", 2600);
      if (bail()) return;

      const manualBtn = await waitForSelector('[data-wf-demo="new-song-manual"]');
      if (bail()) return;
      await cameraFrame(manualBtn, "Paste lyrics — we split them into slides for you", 2400);
      if (bail()) return;
      manualBtn?.click();
      await sleep(700);
      if (bail()) return;

      window.dispatchEvent(new Event(WF_MARKETING_FILL_WAY_MAKER));
      const lyricsEl = await waitForSelector('[data-wf-demo="wizard-manual-lyrics"]');
      if (bail()) return;
      await cameraFrame(lyricsEl, "Way Maker — in your library, synced everywhere", 4200);
      if (bail()) return;

      const addEl = document.querySelector('[data-wf-demo="wizard-add-library"]') as HTMLElement | null;
      await cameraFrame(addEl, "Save to library — then drop into any setlist", 2200);
      if (bail()) return;

      window.dispatchEvent(new Event(WF_MARKETING_REEL_CONFIRM_MANUAL_SONG));
      await waitUntilGone('[data-wf-demo="wizard-shell"]');
      if (bail()) return;
      await sleep(900);
      if (bail()) return;

      router.push("/setlists/new");
      await waitForSelector('[data-wf-demo="reel-new-setlist-root"]');
      if (bail()) return;
      await sleep(800);
      if (bail()) return;

      const formEl =
        (document.querySelector('[data-wf-demo="reel-new-setlist-root"] form') as HTMLElement | null) ??
        (document.querySelector('[data-wf-demo="reel-new-setlist-root"]') as HTMLElement | null);
      await cameraFrame(formEl, "New setlist — we’ll add scripture and a welcome moment", 3000);
      if (bail()) return;

      window.dispatchEvent(new Event(WF_MARKETING_REEL_CREATE_SETLIST));
      const okEdit = await waitForUrlPath((p) => /^\/setlists\/[^/]+\/edit$/.test(p));
      if (bail() || !okEdit) return;
      await sleep(1300);
      if (bail()) return;

      await scrollAndFrame(
        '[data-wf-demo="setlist-reel-order"]',
        "Song, Psalm reading, and a human moment — in order",
        3600,
      );
      if (bail()) return;

      const m = window.location.pathname.match(/^\/setlists\/([^/]+)\/edit$/);
      const setlistId = m?.[1];
      if (setlistId) {
        await pushReelDeckToPresenterWhenReady(setlistId, bail);
      }

      setCaption("Audience output — clean fullscreen for the room");
      setSpotlight(null);
      await sleep(1400);
      if (bail()) return;

      window.open(
        `/present/audience?room=${encodeURIComponent(DEFAULT_PRESENT_ROOM)}&reelFs=1`,
        "_blank",
        "noopener,noreferrer",
      );

      setPhase("outro");
      setCaption("Press Esc to clear the frame overlay · close the audience tab when you’re done");
      await sleep(4500);
    } finally {
      setSpotlight(null);
      setCaption("");
      setIntroTitle(null);
      setPhase("idle");
      runningRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== "idle" && e.key === "Escape") {
        e.preventDefault();
        runningRef.current = false;
        setSpotlight(null);
        setCaption("");
        setIntroTitle(null);
        setPhase("idle");
        return;
      }

      if (phase !== "idle" || runningRef.current) return;

      if (e.ctrlKey && !e.altKey && !e.shiftKey && e.metaKey === false && e.code === "KeyA") {
        if (!marketingDemoHotkeySafeTarget(e.target)) return;
        e.preventDefault();
        armCtrlARef.current = Date.now();
        return;
      }

      if (
        e.ctrlKey &&
        !e.altKey &&
        e.code === "KeyD" &&
        armCtrlARef.current > 0 &&
        Date.now() - armCtrlARef.current < 1100
      ) {
        if (!marketingDemoHotkeySafeTarget(e.target)) return;
        e.preventDefault();
        armCtrlARef.current = 0;
        void runDemo();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "a" || e.key === "A") {
        if (Date.now() - armCtrlARef.current > 1100) armCtrlARef.current = 0;
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [phase, runDemo]);

  const showChrome = phase === "running" || phase === "outro" || introTitle;

  if (!showChrome && !spotlight && !caption) return null;

  return (
    <>
      {phase === "running" || phase === "outro" || introTitle ? (
        <>
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-[11vh] bg-black/90 backdrop-blur-sm"
            aria-hidden
          />
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[10000] h-[11vh] bg-black/90 backdrop-blur-sm"
            aria-hidden
          />
        </>
      ) : null}

      {introTitle ? (
        <div className="pointer-events-none fixed inset-0 z-[10002] flex items-center justify-center bg-black/[0.72]">
          <p className="wf-demo-intro-title-reel bg-gradient-to-br from-sky-200 via-white to-sky-400/90 bg-clip-text px-8 text-center text-4xl font-black tracking-tight text-transparent sm:text-5xl md:text-6xl">
            {introTitle}
          </p>
        </div>
      ) : null}

      {spotlight && (phase === "running" || phase === "outro") ? (
        <div
          className="pointer-events-none fixed z-[10001] ease-[cubic-bezier(0.33,0.92,0.22,1)] will-change-[top,left,width,height]"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            borderRadius: 18,
            border: "2px solid rgba(125, 211, 252, 0.42)",
            boxShadow: `
              0 0 0 9999px rgba(0, 0, 0, 0.965),
              inset 0 0 120px rgba(56, 189, 248, 0.07)
            `,
            transitionProperty: "top, left, width, height, border-radius",
            transitionDuration: `${SPOTLIGHT_TRANSITION_MS}ms`,
          }}
        />
      ) : null}

      {caption && (phase === "running" || phase === "outro") ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[9vh] z-[10003] flex justify-center px-6">
          <p className="max-w-xl rounded-2xl border border-sky-500/30 bg-black/72 px-6 py-3.5 text-center text-base font-medium leading-snug text-sky-50/95 shadow-[0_0_48px_rgba(14,165,233,0.18)] backdrop-blur-md">
            {caption}
          </p>
        </div>
      ) : null}
    </>
  );
}
