/** Default solid backdrops for song / setlist styling (hex). */
export const BACKGROUND_SOLID_SWATCHES = [
  "#0f172a",
  "#1e1b4b",
  "#312e81",
  "#134e4a",
  "#422006",
  "#450a0a",
  "#831843",
] as const;

/** Curated stock stills — direct URLs, no API key (add Pexels the same way). */
export type BackgroundPreset = { id: string; label: string; url: string; credit?: string };

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "aurora",
    label: "Aurora calm",
    url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=85&auto=format&fit=crop",
    credit: "Unsplash",
  },
  {
    id: "mist",
    label: "Mist forest",
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=85&auto=format&fit=crop",
  },
  {
    id: "ocean",
    label: "Ocean horizon",
    url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=85&auto=format&fit=crop",
  },
  {
    id: "light",
    label: "Soft light",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=85&auto=format&fit=crop",
  },
  {
    id: "night-sky",
    label: "Night sky",
    url: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=85&auto=format&fit=crop",
  },
  {
    id: "concert",
    label: "Stage haze",
    url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&q=85&auto=format&fit=crop",
  },
  {
    id: "pexels-dawn",
    label: "Dawn (Pexels)",
    url: "https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=1920",
    credit: "Pexels",
  },
];
