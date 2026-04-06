"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type SlideTransitionId,
  readSlideTransition,
  writeSlideTransition,
} from "@/lib/slide-transition";

export function useSlideTransition(): [SlideTransitionId, (id: SlideTransitionId) => void] {
  const [transition, setTransitionState] = useState<SlideTransitionId>(() =>
    typeof window !== "undefined" ? readSlideTransition() : "fade",
  );

  useEffect(() => {
    const sync = () => setTransitionState(readSlideTransition());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("wf-slide-transition", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("wf-slide-transition", sync as EventListener);
    };
  }, []);

  const setTransition = useCallback((id: SlideTransitionId) => {
    writeSlideTransition(id);
    setTransitionState(id);
  }, []);

  return [transition, setTransition];
}
