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
 * Ordered spotlight tour — each step lights one real control.
 */
export const TUTORIAL_TOUR_STEPS: TourStep[] = [
  {
    id: "setlist",
    path: "/dashboard",
    target: "tour-dash-setlist",
    title: "Choose the setlist",
    body: "This dropdown picks which service order is loaded. Every slide from every song in that list becomes the presenter deck.",
  },
  {
    id: "new-setlist",
    path: "/dashboard",
    target: "tour-dash-new-setlist",
    title: "Start a new setlist",
    body: "Jumps to the editor to build a fresh order of service — add songs from your library (each song brings all of its slides).",
  },
  {
    id: "present",
    path: "/dashboard",
    target: "tour-dash-present",
    title: "Open Presenter",
    body: "Opens the operator view in a new tab. Arrow keys or space advance slides; Audience and Remote use the same room.",
  },
  {
    id: "bible-quick",
    path: "/dashboard",
    target: "tour-dash-bible",
    title: "Bible quick preview",
    body: "Type a reference or phrase, then Preview — the main preview updates (verse slides). Great for last-minute inserts.",
  },
  {
    id: "global-search",
    path: "/dashboard",
    target: "tour-topbar-search",
    title: "Search bar",
    body: "Quick jump — search songs, verses, or notes (this demo is visual only until search is wired).",
  },
  {
    id: "songs",
    path: "/songs",
    target: "tour-songs-search",
    title: "Songs library",
    body: "Search your library. Each song contains multiple slides (verse, chorus…). Edit lyrics and backgrounds here.",
  },
  {
    id: "setlists",
    path: "/setlists",
    target: "tour-setlists-new",
    title: "New setlist",
    body: "Build your order of service. Add linked songs (all their slides flow to Present) or custom prayer/scripture blocks.",
  },
  {
    id: "studio",
    path: "/studio",
    target: "tour-studio-lyrics",
    title: "Slide Studio",
    body: "Paste lyrics and adjust lines per slide to see how many slides you get. The AI bridge returns dummy lines for testing.",
  },
  {
    id: "bible-ai",
    path: "/bible",
    target: "tour-bible-ai",
    title: "Bible + AI ideas",
    body: "Look up references or use “Get AI verse options” for themed suggestions (test data). Tap an option to load the passage.",
  },
];
