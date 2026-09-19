/**
 * Who's signed in, as far as the browser is concerned.
 *
 * There is no token and no session table — the current user is just an id kept in
 * `localStorage`. `src/api.ts` sends it as a header; `src/mocks/client.ts` reads it
 * directly. Those two files and this one are the only places it's touched:
 * components ask `../api` who the user is and never see storage.
 *
 * `localStorage` throws outright in a private window, with site data blocked, and
 * anywhere there's no browser at all (`bun test`, a script). So every access is
 * wrapped and there's an in-memory fallback behind it: the session then lasts for
 * the page view instead of the device, which is the right failure — being signed
 * out mid-demo because storage is disabled would be worse.
 */

const KEY = "pupi.user_id";

/** Authoritative whenever storage is unavailable. Lost on reload, which is fine. */
let fallback: number | null = null;

export function readUserId(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const id = Number(raw);
    return Number.isInteger(id) ? id : fallback;
  } catch {
    return fallback;
  }
}

export function writeUserId(id: number | null): void {
  fallback = id;
  try {
    if (id === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(id));
  } catch {
    // Storage is off. `fallback` above is now carrying the session.
  }
}
