"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { TUTORIAL_TOUR_STEPS } from "@/lib/tutorial-tour-steps";

type TutorialTourContextValue = {
  active: boolean;
  stepIndex: number;
  steps: typeof TUTORIAL_TOUR_STEPS;
  startTour: () => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  total: number;
};

const TutorialTourContext = createContext<TutorialTourContextValue | null>(null);

export function TutorialTourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const stopTour = useCallback(() => {
    setActive(false);
    setStepIndex(0);
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, TUTORIAL_TOUR_STEPS.length - 1));
  }, []);

  const prevStep = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const value = useMemo(
    () => ({
      active,
      stepIndex,
      steps: TUTORIAL_TOUR_STEPS,
      startTour,
      stopTour,
      nextStep,
      prevStep,
      total: TUTORIAL_TOUR_STEPS.length,
    }),
    [active, stepIndex, startTour, stopTour, nextStep, prevStep],
  );

  return (
    <TutorialTourContext.Provider value={value}>{children}</TutorialTourContext.Provider>
  );
}

export function useTutorialTour() {
  const ctx = useContext(TutorialTourContext);
  if (!ctx) {
    throw new Error("useTutorialTour must be used within TutorialTourProvider");
  }
  return ctx;
}
