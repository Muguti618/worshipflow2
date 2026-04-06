export type WorshipLibraryMode = "local" | "cloud";

let mode: WorshipLibraryMode = "local";

export function setLibraryMode(next: WorshipLibraryMode): void {
  mode = next;
}

export function getLibraryMode(): WorshipLibraryMode {
  return mode;
}
