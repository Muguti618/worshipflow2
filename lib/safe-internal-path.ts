/** Prevent open redirects: only same-origin paths (with optional query). */
export function safeInternalPath(raw: string | null | undefined, fallback: string): string {
  if (raw == null || typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  if (/^[a-zA-Z][a-zA-Z+.-]*:/.test(t)) return fallback;
  return t;
}
