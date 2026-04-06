const KEY = "worshipflow-guest-dashboard";

export function setGuestDashboardAllow(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(KEY, "1");
}

export function clearGuestDashboardAllow(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function hasGuestDashboardAllow(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
