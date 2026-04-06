/**
 * Browser-only account helpers for LumenWorship.
 * Sessions and credentials live in localStorage — suitable for demos only;
 * production apps should use a real backend and httpOnly cookies.
 */

export const WF_SESSION_KEY = "worshipflow-auth-session";
export const WF_USERS_KEY = "worshipflow-auth-users";

export const WF_AUTH_CHANGE_EVENT = "wf-auth-change";

export type AuthSession = {
  userId: string;
  email: string;
  name: string;
};

type StoredUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

function notifyAuthChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WF_AUTH_CHANGE_EVENT));
}

function hexFromBuffer(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashCredential(email: string, password: string): Promise<string> {
  const normalized = `${email.toLowerCase().trim()}:${password}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const enc = new TextEncoder().encode(normalized);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return hexFromBuffer(buf);
  }
  try {
    return btoa(normalized);
  } catch {
    return `fb:${normalized.length}:${[...normalized].reduce((a, c) => a + c.charCodeAt(0), 0)}`;
  }
}

function readUsersRaw(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WF_USERS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter(
      (u): u is StoredUser =>
        typeof u === "object" &&
        u !== null &&
        typeof (u as StoredUser).id === "string" &&
        typeof (u as StoredUser).email === "string" &&
        typeof (u as StoredUser).name === "string" &&
        typeof (u as StoredUser).passwordHash === "string",
    );
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  localStorage.setItem(WF_USERS_KEY, JSON.stringify(users));
}

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WF_SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (typeof p !== "object" || p === null) return null;
    const { userId, email, name } = p as Record<string, unknown>;
    if (
      typeof userId !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string"
    ) {
      return null;
    }
    return { userId, email, name };
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession): void {
  localStorage.setItem(WF_SESSION_KEY, JSON.stringify(session));
  notifyAuthChange();
}

export function clearSession(): void {
  localStorage.removeItem(WF_SESSION_KEY);
  notifyAuthChange();
}

function newUserId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `wf-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function registerAccount(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Registration is only available in the browser." };
  }
  const em = email.trim().toLowerCase();
  const nm = name.trim();
  if (!nm) return { ok: false, error: "Enter your name." };
  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const users = readUsersRaw();
  if (users.some((u) => u.email.toLowerCase() === em)) {
    return { ok: false, error: "An account with this email already exists." };
  }
  const passwordHash = await hashCredential(em, password);
  const id = newUserId();
  writeUsers([...users, { id, email: em, name: nm, passwordHash }]);
  const session: AuthSession = { userId: id, email: em, name: nm };
  writeSession(session);
  return { ok: true, session };
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Sign-in is only available in the browser." };
  }
  const em = email.trim().toLowerCase();
  if (!em) return { ok: false, error: "Enter your email." };
  const users = readUsersRaw();
  const u = users.find((x) => x.email.toLowerCase() === em);
  if (!u) {
    return { ok: false, error: "No account found for that email." };
  }
  const passwordHash = await hashCredential(em, password);
  if (passwordHash !== u.passwordHash) {
    return { ok: false, error: "Incorrect password." };
  }
  const session: AuthSession = { userId: u.id, email: u.email, name: u.name };
  writeSession(session);
  return { ok: true, session };
}
