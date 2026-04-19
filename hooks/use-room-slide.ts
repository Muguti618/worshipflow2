"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PresentBeamState } from "@/lib/present-beam";
import { parsePresentBeamState } from "@/lib/present-beam";
import { parseDeckSlidesJson } from "@/lib/present-deck-json";
import type { DeckSlide } from "@/lib/setlists-catalog";
import {
  readPersistedBeam,
  readPersistedSlideIndex,
  writePersistedBeam,
  writePersistedSlideIndex,
} from "@/lib/present-local-state";
import { PRESENT_ACTIVE_ROOM_BC } from "@/lib/present-active-room-broadcast";

export const PRESENT_BC_PREFIX = "worshipflow2-present";

/** Audience / projector: tight poll so another device’s slide advances feel instant. */
const POLL_MS_VIEWER = 200;
/** Presenter + phone remote (both use master): follow the other device’s POSTs quickly. */
const POLL_MS_MASTER = 320;
/** Deck JSON can be large — short debounce still cuts burst edits on dashboard. */
const DECK_POST_DEBOUNCE_MS = 100;

function channelName(room: string) {
  return `${PRESENT_BC_PREFIX}:${room}`;
}

type Options = {
  room: string;
  /** master = can POST (presenter, phone control); viewer = audience */
  role: "master" | "viewer";
  /** This device’s deck (usually localStorage); merged with server mirror for phones / audience. */
  localDeck: DeckSlide[];
};

export function useRoomSlide({ room, role, localDeck }: Options) {
  const [index, setIndex] = useState(0);
  const [beam, setBeam] = useState<PresentBeamState | null>(null);
  const [serverDeck, setServerDeck] = useState<DeckSlide[] | null>(null);
  const [sessionSuperseded, setSessionSuperseded] = useState(false);
  const [netOnline, setNetOnline] = useState(true);
  const indexRef = useRef(0);
  const beamRef = useRef<PresentBeamState | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const lastRemoteUpdateAtRef = useRef<number>(0);
  const pendingMasterSlideRef = useRef<number | null>(null);
  const beamPostInFlightRef = useRef(false);
  const presentPollGenerationRef = useRef(0);
  /** Last server `updatedAt` seen from a successful `publishBeam` response (for stale poll guard). */
  const lastRemoteBeamAtRef = useRef(0);

  const workingDeck = useMemo(() => {
    if (serverDeck && serverDeck.length > 0) {
      if (role === "viewer") return serverDeck;
      if (serverDeck.length >= localDeck.length) return serverDeck;
    }
    return localDeck;
  }, [role, serverDeck, localDeck]);

  const slideCount = Math.max(1, workingDeck.length);
  const slideCountRef = useRef(slideCount);
  slideCountRef.current = slideCount;

  const clamp = useCallback(
    (n: number) => Math.max(0, Math.min(Math.max(0, slideCount - 1), n)),
    [slideCount],
  );

  const publish = useCallback(
    async (next: number) => {
      const c = clamp(next);
      setIndex(c);
      indexRef.current = c;
      writePersistedSlideIndex(room, c);
      bcRef.current?.postMessage({ type: "slide", index: c });
      const mySlide = c;
      if (role === "master") pendingMasterSlideRef.current = mySlide;
      try {
        const res = await fetch("/api/present/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, slideIndex: c }),
        });
        if (res.ok && role === "master") {
          try {
            const j = (await res.json()) as { updatedAt?: number };
            if (typeof j.updatedAt === "number" && Number.isFinite(j.updatedAt)) {
              lastRemoteUpdateAtRef.current = Math.max(
                lastRemoteUpdateAtRef.current,
                j.updatedAt,
              );
            } else {
              lastRemoteUpdateAtRef.current = Math.max(
                lastRemoteUpdateAtRef.current,
                Date.now(),
              );
            }
          } catch {
            lastRemoteUpdateAtRef.current = Math.max(
              lastRemoteUpdateAtRef.current,
              Date.now(),
            );
          }
          presentPollGenerationRef.current += 1;
        }
      } catch {
        /* offline — localStorage + BroadcastChannel still work */
      } finally {
        if (role === "master" && pendingMasterSlideRef.current === mySlide) {
          pendingMasterSlideRef.current = null;
        }
      }
    },
    [room, clamp, role],
  );

  const publishBeam = useCallback(
    async (nextBeam: PresentBeamState | null): Promise<boolean> => {
      const previous = beamRef.current;
      setBeam(nextBeam);
      beamRef.current = nextBeam;
      writePersistedBeam(room, nextBeam);
      bcRef.current?.postMessage({ type: "beam", beam: nextBeam });
      beamPostInFlightRef.current = true;
      try {
        const res = await fetch("/api/present/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, beam: nextBeam }),
        });
        if (!res.ok) {
          setBeam(previous);
          beamRef.current = previous;
          writePersistedBeam(room, previous);
          bcRef.current?.postMessage({ type: "beam", beam: previous });
          return false;
        }
        try {
          const j = (await res.json()) as { updatedAt?: number };
          if (typeof j.updatedAt === "number" && Number.isFinite(j.updatedAt)) {
            lastRemoteUpdateAtRef.current = Math.max(
              lastRemoteUpdateAtRef.current,
              j.updatedAt,
            );
            lastRemoteBeamAtRef.current = Math.max(lastRemoteBeamAtRef.current, j.updatedAt);
          } else {
            const t = Date.now();
            lastRemoteUpdateAtRef.current = Math.max(lastRemoteUpdateAtRef.current, t);
            lastRemoteBeamAtRef.current = Math.max(lastRemoteBeamAtRef.current, t);
          }
        } catch {
          const t = Date.now();
          lastRemoteUpdateAtRef.current = Math.max(lastRemoteUpdateAtRef.current, t);
          lastRemoteBeamAtRef.current = Math.max(lastRemoteBeamAtRef.current, t);
        }
        presentPollGenerationRef.current += 1;
        return true;
      } catch {
        return true;
      } finally {
        beamPostInFlightRef.current = false;
      }
    },
    [room],
  );

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    beamRef.current = beam;
  }, [beam]);

  useEffect(() => {
    setServerDeck(null);
    setSessionSuperseded(false);
    lastRemoteBeamAtRef.current = 0;
  }, [room]);

  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(PRESENT_ACTIVE_ROOM_BC);
      ch.onmessage = (e: MessageEvent<{ type?: string; room?: string }>) => {
        if (e.data?.type !== "active-present-room") return;
        const next = typeof e.data.room === "string" ? e.data.room.trim() : "";
        if (next && next !== room) setSessionSuperseded(true);
      };
    } catch {
      /* ignore */
    }
    return () => {
      ch?.close();
    };
  }, [room]);

  const localDeckSig = useMemo(() => JSON.stringify(localDeck), [localDeck]);

  useEffect(() => {
    if (role !== "master") return;
    const t = window.setTimeout(() => {
      void fetch("/api/present/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, deck: localDeck }),
      }).catch(() => {});
    }, DECK_POST_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [room, role, localDeckSig, localDeck]);

  useLayoutEffect(() => {
    const maxIdx = Math.max(0, slideCountRef.current - 1);
    const si = readPersistedSlideIndex(room);
    if (si !== null) {
      const c = Math.max(0, Math.min(maxIdx, si));
      setIndex(c);
      indexRef.current = c;
    }
    const pb = readPersistedBeam(room);
    setBeam(pb);
    beamRef.current = pb;
  }, [room]);

  useEffect(() => {
    const maxIdx = Math.max(0, slideCount - 1);
    setIndex((prev) => {
      const next = Math.min(prev, maxIdx);
      if (next !== prev) indexRef.current = next;
      return next;
    });
  }, [slideCount]);

  useEffect(() => {
    setNetOnline(navigator.onLine);
    const onOnline = () => setNetOnline(true);
    const onOffline = () => setNetOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const ch = new BroadcastChannel(channelName(room));
    bcRef.current = ch;
    const onMsg = (e: MessageEvent<{ type?: string; index?: number; beam?: unknown }>) => {
      if (e.data?.type === "slide" && typeof e.data.index === "number") {
        const c = clamp(e.data.index);
        setIndex(c);
        indexRef.current = c;
        writePersistedSlideIndex(room, c);
        return;
      }
      if (e.data?.type === "beam") {
        const b = e.data.beam === null ? null : parsePresentBeamState(e.data.beam);
        setBeam(b);
        beamRef.current = b;
        writePersistedBeam(room, b);
      }
    };
    ch.addEventListener("message", onMsg);
    return () => {
      ch.removeEventListener("message", onMsg);
      ch.close();
      bcRef.current = null;
    };
  }, [room, clamp]);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const genAtPullStart = presentPollGenerationRef.current;
      try {
        const r = await fetch(`/api/present/state?room=${encodeURIComponent(room)}`, {
          cache: "no-store",
        });
        if (!r.ok || cancelled) return;
        const j = (await r.json()) as {
          slideIndex?: number;
          beam?: unknown;
          updatedAt?: number;
          deck?: unknown;
          superseded?: boolean;
        };
        if (j.superseded === true) {
          setSessionSuperseded(true);
          setServerDeck(null);
          if (typeof j.updatedAt === "number" && Number.isFinite(j.updatedAt)) {
            lastRemoteUpdateAtRef.current = Math.max(lastRemoteUpdateAtRef.current, j.updatedAt);
          }
          return;
        }
        const staleSlidePoll =
          role === "master" && genAtPullStart < presentPollGenerationRef.current;
        const remoteUpdatedAt =
          typeof j.updatedAt === "number" && Number.isFinite(j.updatedAt) ? j.updatedAt : null;
        if (remoteUpdatedAt !== null && remoteUpdatedAt < lastRemoteUpdateAtRef.current) return;
        if (remoteUpdatedAt !== null) lastRemoteUpdateAtRef.current = remoteUpdatedAt;

        let parsedDeck: DeckSlide[] | null = null;
        if ("deck" in j && j.deck === null) {
          setServerDeck(null);
        } else {
          parsedDeck = parseDeckSlidesJson(j.deck);
          if (parsedDeck && parsedDeck.length > 0) {
            setServerDeck(parsedDeck);
          }
        }

        if (typeof j.slideIndex === "number" && !staleSlidePoll) {
          // Clamp against the deck length *in this response*, not the pre-fetch workingDeck.
          // Otherwise a stale closure can cap slideIndex to an old shorter deck; React only
          // clamps index down on deck shrink, never back up when the deck grows — wrong slide.
          const deckLenForSlide =
            parsedDeck && parsedDeck.length > 0 ? parsedDeck.length : slideCountRef.current;
          const safeMax = Math.max(0, deckLenForSlide - 1);
          const c = Math.max(0, Math.min(safeMax, Math.floor(j.slideIndex)));
          const pend = pendingMasterSlideRef.current;
          if (role === "master" && pend !== null && c !== pend) {
            /* stale */
          } else if (c !== indexRef.current) {
            setIndex(c);
            indexRef.current = c;
            writePersistedSlideIndex(room, c);
          } else {
            writePersistedSlideIndex(room, c);
          }
        }
        if ("beam" in j && !(role === "master" && beamPostInFlightRef.current)) {
          const rawBeam = j.beam;
          const parsed =
            rawBeam === null ? null : parsePresentBeamState(rawBeam);

          if (rawBeam != null && parsed === null && beamRef.current) {
            /* Server sent a beam blob we could not parse — do not treat as "clear beam". */
          } else if (parsed === null && beamRef.current) {
            // Only accept `beam: null` when the row's `updated_at` is strictly newer than our last
            // confirmed beam snapshot (avoids deck/slide polls with stale null wiping scripture).
            if (
              remoteUpdatedAt !== null &&
              remoteUpdatedAt > lastRemoteBeamAtRef.current
            ) {
              setBeam(null);
              beamRef.current = null;
              writePersistedBeam(room, null);
              lastRemoteBeamAtRef.current = Math.max(
                lastRemoteBeamAtRef.current,
                remoteUpdatedAt,
              );
            }
          } else {
            const nextSig = parsed ? JSON.stringify(parsed) : "";
            const prevSig = beamRef.current ? JSON.stringify(beamRef.current) : "";
            if (nextSig !== prevSig) {
              setBeam(parsed);
              beamRef.current = parsed;
            }
            writePersistedBeam(room, parsed);
            if (remoteUpdatedAt !== null) {
              lastRemoteBeamAtRef.current = Math.max(lastRemoteBeamAtRef.current, remoteUpdatedAt);
            }
          }
        }
      } catch {
        /* network */
      }
    };
    void pull();
    if (!netOnline) {
      return () => {
        cancelled = true;
      };
    }
    const pollMs = role === "master" ? POLL_MS_MASTER : POLL_MS_VIEWER;
    const id = window.setInterval(pull, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [room, clamp, netOnline, role]);

  const go = useCallback(
    (delta: number) => {
      if (role !== "master") return;
      const b = beamRef.current;
      if (b && b.slides.length > 0) {
        const ni = Math.max(0, Math.min(b.slides.length - 1, b.index + delta));
        if (ni !== b.index) void publishBeam({ ...b, index: ni });
        return;
      }
      void publish(indexRef.current + delta);
    },
    [role, publish, publishBeam],
  );

  const jump = useCallback(
    (n: number) => {
      if (role !== "master") return;
      void publish(n);
    },
    [role, publish],
  );

  const clearBeam = useCallback(() => {
    if (role !== "master") return;
    void publishBeam(null);
  }, [role, publishBeam]);

  return {
    index,
    beam,
    deck: workingDeck,
    sessionSuperseded,
    publish,
    publishBeam,
    clearBeam,
    go,
    jump,
    setIndexView: setIndex,
  };
}
