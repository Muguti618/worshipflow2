"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ACTIVE_DECK_STORAGE_KEY,
  DECK_SYNC_CHANNEL,
  EMPTY_PRESENTER_PLACEHOLDER,
  readActiveDeck,
} from "@/lib/active-deck";
import type { DeckSlide } from "@/lib/setlists-catalog";

function fallbackDeck(): DeckSlide[] {
  return EMPTY_PRESENTER_PLACEHOLDER;
}

export function useActiveDeck(): DeckSlide[] {
  /** Same on server and first client paint — read localStorage only after mount (useEffect). */
  const [slides, setSlides] = useState<DeckSlide[]>(() => fallbackDeck());

  const reload = useCallback(() => {
    const raw = readActiveDeck();
    if (!raw || raw.length === 0) {
      setSlides(fallbackDeck());
      return;
    }
    setSlides(raw);
  }, []);

  useEffect(() => {
    reload();
    const ch = new BroadcastChannel(DECK_SYNC_CHANNEL);
    ch.onmessage = () => reload();
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_DECK_STORAGE_KEY) reload();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      ch.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [reload]);

  return slides;
}
