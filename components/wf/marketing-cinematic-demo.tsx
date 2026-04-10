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

  const setSpotFromEl = useCallback((el: Element | null, pad = 14) => {
    const box = measureBox(el, pad);
    setSpotlight(box);
  }, []);

  const runDemo = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("running");
    setCaption("");
    setSpotlight(null);

    const bail = () => !runningRef.current;

    const scrollAndFrame = async (selector: string, cap: string, holdMs: number) => {
      if (bail()) return;
      const el = await waitForSelector(selector);
      if (bail()) return;
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(260);
      if (bail()) return;
      setCaption(cap);
      setSpotFromEl(document.querySelector(selector));
      await sleep(holdMs);
    };

    try {
      setIntroTitle("WorshipFlow2");
      await sleep(980);
      if (bail()) return;
      setIntroTitle(null);

      await scrollAndFrame('[data-wf-tour="tour-nav-songs"]', "Song library → slides → Sunday", 720);
      if (bail()) return;

      router.push("/songs");
      await waitForSelector('[data-wf-tour="tour-songs-new"]');
      if (bail()) return;
      await sleep(320);

      await scrollAndFrame('[data-wf-tour="tour-songs-new"]', "Add a song in seconds", 620);
      if (bail()) return;

      window.dispatchEvent(new Event(WF_MARKETING_OPEN_NEW_SONG));
      await waitForSelector('[data-wf-demo="wizard-shell"]');
      if (bail()) return;
      await sleep(320);

      await scrollAndFrame('[data-wf-demo="wizard-shell"]', "Manual or AI — your lyrics", 520);
      if (bail()) return;

      const manualBtn = await waitForSelector('[data-wf-demo="new-song-manual"]');
      if (bail()) return;
      setCaption("Paste lyrics → auto-split slides");
      setSpotFromEl(manualBtn);
      await sleep(520);
      if (bail()) return;
      manualBtn?.click();
      await sleep(320);

      window.dispatchEvent(new Event(WF_MARKETING_FILL_WAY_MAKER));
      const lyricsEl = await waitForSelector('[data-wf-demo="wizard-manual-lyrics"]');
      if (bail()) return;
      lyricsEl?.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(260);
      if (bail()) return;
      setCaption("Way Maker — saved to library");
      setSpotFromEl(lyricsEl);
      await sleep(980);
      if (bail()) return;

      setCaption("Add to library");
      setSpotFromEl(document.querySelector('[data-wf-demo="wizard-add-library"]'));
      await sleep(420);
      if (bail()) return;

      window.dispatchEvent(new Event(WF_MARKETING_REEL_CONFIRM_MANUAL_SONG));
      await waitUntilGone('[data-wf-demo="wizard-shell"]');
      if (bail()) return;
      await sleep(380);

      router.push("/setlists/new");
      await waitForSelector('[data-wf-demo="reel-new-setlist-root"]');
      if (bail()) return;
      await sleep(280);

      setCaption("New setlist → scripture + moment");
      setSpotFromEl(document.querySelector('form'));
      await sleep(520);
      if (bail()) return;

      window.dispatchEvent(new Event(WF_MARKETING_REEL_CREATE_SETLIST));
      const okEdit = await waitForUrlPath((p) => /^\/setlists\/[^/]+\/edit$/.test(p));
      if (bail() || !okEdit) return;
      await sleep(720);
      if (bail()) return;

      await scrollAndFrame('[data-wf-demo="setlist-reel-order"]', "Song + Psalm moment + welcome beat", 780);
      if (bail()) return;

      const m = window.location.pathname.match(/^\/setlists\/([^/]+)\/edit$/);
      const setlistId = m?.[1];
      if (setlistId) {
        await pushReelDeckToPresenterWhenReady(setlistId, bail);
      }

      setCaption("Audience view — fullscreen output");
      setSpotlight(null);
      await sleep(400);
      if (bail()) return;

      window.open(
        `/present/audience?room=${encodeURIComponent(DEFAULT_PRESENT_ROOM)}&reelFs=1`,
        "_blank",
        "noopener,noreferrer",
      );

      setPhase("outro");
      setCaption("Esc clears overlay · close the extra tab when done");
      await sleep(1400);
    } finally {
      setSpotlight(null);
      setCaption("");
      setIntroTitle(null);
      setPhase("idle");
      runningRef.current = false;
    }
  }, [router, setSpotFromEl]);

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
            className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-[7vh] bg-black/80 backdrop-blur-[2px]"
            aria-hidden
          />
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[10000] h-[7vh] bg-black/80 backdrop-blur-[2px]"
            aria-hidden
          />
        </>
      ) : null}

      {introTitle ? (
        <div className="pointer-events-none fixed inset-0 z-[10002] flex items-center justify-center bg-black/55">
          <p className="wf-demo-intro-title-reel bg-gradient-to-br from-sky-200 via-white to-sky-400/90 bg-clip-text px-8 text-center text-4xl font-black tracking-tight text-transparent sm:text-5xl">
            {introTitle}
          </p>
        </div>
      ) : null}

      {spotlight && (phase === "running" || phase === "outro") ? (
        <div
          className="pointer-events-none fixed z-[10001] transition-all duration-[680ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: "0 0 0 9999px rgba(2, 8, 18, 0.9)",
            borderRadius: 16,
            border: "2px solid rgba(56, 189, 248, 0.5)",
          }}
        />
      ) : null}

      {caption && (phase === "running" || phase === "outro") ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[10vh] z-[10003] flex justify-center px-6">
          <p className="max-w-lg rounded-2xl border border-sky-500/25 bg-black/65 px-5 py-3 text-center text-sm font-medium leading-snug text-sky-50/95 shadow-[0_0_40px_rgba(14,165,233,0.15)] backdrop-blur-md">
            {caption}
          </p>
        </div>
      ) : null}
    </>
  );
}
