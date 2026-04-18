/**
 * Built-in Pro accounts (no Stripe / DB comp row required).
 * Optional extra IDs: comma- or whitespace-separated UUIDs in WF_PRO_USER_IDS (server env).
 */
const BUILTIN_PRO_USER_IDS = new Set(
  [
    "2febe671-f7e7-471f-b964-a4de2ea5ba41",
    "fcc0f03e-831a-43cc-affa-79a2e887bd26",
  ].map((u) => u.toLowerCase()),
);

export function isUserIdProAllowlisted(userId: string | null | undefined): boolean {
  const id = userId?.trim().toLowerCase();
  if (!id) return false;
  if (BUILTIN_PRO_USER_IDS.has(id)) return true;
  const raw = process.env.WF_PRO_USER_IDS ?? "";
  if (!raw.trim()) return false;
  for (const part of raw.split(/[\s,]+/)) {
    const p = part.trim().toLowerCase();
    if (p && p === id) return true;
  }
  return false;
}
