export type TourStep = {
  id: string;
  /** App route for this step (tour navigates here automatically). */
  path: string;
  /** Value of `data-wf-tour` on the target element. */
  target: string;
  title: string;
  body: string;
};

/**
 * Spotlight tour — Songs → add music → setlist → Present → beam scripture.
 */
export const TUTORIAL_TOUR_STEPS: TourStep[] = [
  {
    id: "nav-songs",
    path: "/dashboard",
    target: "tour-nav-songs",
    title: "Songs in the sidebar",
    body: "Your library lives under Songs — every song is a stack of slides (verses, choruses, etc.) you reuse in setlists.",
  },
  {
    id: "new-song",
    path: "/songs",
    target: "tour-songs-new",
    title: "Add a new song",
    body: "Open + New to add lyrics manually or with AI, set backgrounds, then drop the song into a setlist.",
  },
  {
    id: "presenter-setlist",
    path: "/dashboard",
    target: "tour-dash-setlist",
    title: "Presenter setlist",
    body: "Choose which service order loads into Present. Every slide from every song in that list becomes your deck.",
  },
  {
    id: "open-presenter",
    path: "/dashboard",
    target: "tour-dash-present",
    title: "Open Presenter",
    body: "Launch the operator screen — advance with arrows or space. Open Audience on the projector; both stay on the same room.",
  },
  {
    id: "bible-beam",
    path: "/present",
    target: "tour-present-quick-verse",
    title: "Bible verse beam",
    body: "Quick beam sends scripture or a library / pasted song to Audience (and Remote on Pro) without editing the setlist — stay on the Song tab to chain spontaneous songs.",
  },
];
