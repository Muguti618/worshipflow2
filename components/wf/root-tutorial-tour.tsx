"use client";

import { TutorialTourProvider } from "@/components/wf/tutorial-tour-context";
import { TutorialTourOverlay } from "@/components/wf/tutorial-tour-overlay";

/** Wraps the app so the spotlight tour survives navigation (e.g. Dashboard → Present). */
export function RootTutorialTour({ children }: { children: React.ReactNode }) {
  return (
    <TutorialTourProvider>
      {children}
      <TutorialTourOverlay />
    </TutorialTourProvider>
  );
}
