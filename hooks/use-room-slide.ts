"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PresentBeamState } from "@/lib/present-beam";
import { parsePresentBeamState } from "@/lib/present-beam";
import {
  readPersistedBeam,
  readPersistedSlideIndex,
  writePersistedBeam,
  writePersistedSlideIndex,
} from "@/lib/present-local-state";

export const PRESENT_BC_PREFIX = "worshipflow-present";

function channelName(room: string) {
  return `${PRESENT_BC_PREFIX}:${room}`;
}

type Options = {
  room: string;
  /** master = can POST (presenter, phone control); viewer = audience */
  role: "master" | "viewer";
  slideCount: number;
};

export function useRoomSlide({ room, role, slideCount }: Options) {
  const [index, setIndex] = useState(0);
  const [beam, setBeam] = useState<PresentBeamState | null>(null);
  const [netOnline, setNetOnline] = useState(true);
  const indexRef = useRef(0);
  const beamRef = useRef<PresentBeamState | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const lastRemoteUpdateAtRef = useRef<number>(0);
  /** While a deck slide POST is in flight, ignore polled slideIndex that still shows the old server value (avoids flicker). */
  const pendingMasterSlideRef = useRef<number | null>(null);
  /**
   * After the server accepts a slide POST, ignore poll responses that started before that bump — they often
   * carry the previous slideIndex with the same or older updatedAt (straggler GETs).
   */
  const presentPollGenerationRef = useRef(0);
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
    async (nextBeam: PresentBeamState | null) => {
      setBeam(nextBeam);
      beamRef.current = nextBeam;
      writePersistedBeam(room, nextBeam);
      bcRef.current?.postMessage({ type: "beam", beam: nextBeam });
      try {
        const res = await fetch("/api/present/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, beam: nextBeam }),
        });
        if (res.ok) {
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
        /* offline */
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

  /* Hydrate from storage when the room changes only — avoid re-reading on deck length changes (races BC / slide reset). */
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
        const j = (await r.json()) as { slideIndex?: number; beam?: unknown; updatedAt?: number };
        if (role === "master" && genAtPullStart < presentPollGenerationRef.current) {
          /* Straggler from before last successful slide POST — discard whole payload (slide + timestamps + beam). */
          return;
        }
        const remoteUpdatedAt =
          typeof j.updatedAt === "number" && Number.isFinite(j.updatedAt) ? j.updatedAt : null;
        if (remoteUpdatedAt !== null && remoteUpdatedAt < lastRemoteUpdateAtRef.current) return;
        if (remoteUpdatedAt !== null) lastRemoteUpdateAtRef.current = remoteUpdatedAt;

        if (typeof j.slideIndex === "number") {
          const c = clamp(j.slideIndex);
          const pend = pendingMasterSlideRef.current;
          if (role === "master" && pend !== null && c !== pend) {
            /* Stale read while our slide POST is still in flight or racing GET */
          } else if (c !== indexRef.current) {
            setIndex(c);
            indexRef.current = c;
            writePersistedSlideIndex(room, c);
          } else {
            writePersistedSlideIndex(room, c);
          }
        }
        if ("beam" in j) {
          const parsed =
            j.beam === null ? null : parsePresentBeamState(j.beam);
          const nextSig = parsed ? JSON.stringify(parsed) : "";
          const prevSig = beamRef.current ? JSON.stringify(beamRef.current) : "";
          if (nextSig !== prevSig) {
            setBeam(parsed);
            beamRef.current = parsed;
          }
          writePersistedBeam(room, parsed);
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
    const pollMs = role === "master" ? 1100 : 700;
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

  return { index, beam, publish, publishBeam, clearBeam, go, jump, setIndexView: setIndex };
}
