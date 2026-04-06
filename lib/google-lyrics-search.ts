/** Opens Google with “{query} lyrics” — user finds a source to copy from (licensing is their responsibility). */
export function googleLyricsSearchUrl(songQuery: string): string {
  const base = songQuery.trim() || "worship song";
  const q = `${base} lyrics`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
