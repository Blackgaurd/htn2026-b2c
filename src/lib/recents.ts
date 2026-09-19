/**
 * Recently opened washrooms, so the search screen has something to offer before
 * you type.
 *
 * It holds what you actually picked, not what you typed. A list of past search
 * strings made you re-run the search to get back to a room you had already found;
 * a list of rooms is one tap from the thing itself. Ids only: names, scores and
 * badges are read fresh from the catalogue, so a recent row is never a stale copy
 * of a washroom.
 *
 * Per-viewer convenience, nothing more. It lives in `localStorage`, never reaches
 * the API, and losing it costs nothing. Every access is wrapped because storage
 * throws outright in a private window, and an empty list is the right answer
 * there rather than a blank screen.
 */

const KEY = "pupi.recent_washrooms";
const MAX = 6;

export function readRecents(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is number => Number.isInteger(x)).slice(0, MAX);
  } catch {
    return [];
  }
}

/** Most recent first, with any earlier visit to the same washroom removed. */
export function pushRecent(bathroomId: number): number[] {
  if (!Number.isInteger(bathroomId)) return readRecents();

  const next = [bathroomId, ...readRecents().filter(id => id !== bathroomId)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not persisted. The list is still correct for this page view.
  }
  return next;
}

export function clearRecents(): number[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
  return [];
}
