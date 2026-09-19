/**
 * THE CONTRACT.
 *
 * The only file both the frontend and backend people edit. Agree on it early,
 * then leave it alone — a change here breaks the other person's build instantly
 * (which is the point, but say it out loud before you do it).
 *
 * Nothing here may import from `src/` or `server/`. Types and constants only,
 * so it is safe to pull into the browser bundle.
 */

/** One row of the demo table. Replace with your real domain object. */
export type Item = {
  id: number;
  title: string;
  done: boolean;
  /** SQLite `datetime('now')` — UTC, "YYYY-MM-DD HH:MM:SS". */
  created_at: string;
};

/** Request bodies, keyed by the operation that sends them. */
export type CreateItemBody = { title: string };
export type UpdateItemBody = { done: boolean };

/** What every failed response looks like. Frontend can rely on this shape. */
export type ApiError = { error: string };

/**
 * URL builders, shared by both sides so paths can never drift apart.
 * The server registers `paths.items` / `paths.item` as route patterns;
 * the client calls the functions to build concrete URLs.
 */
export const paths = {
  items: "/api/items",
  item: (id: number | string) => `/api/items/${id}`,
} as const;

/** Route patterns as the server registers them (`:id` placeholders intact). */
export const routePatterns = {
  items: "/api/items",
  item: "/api/items/:id",
} as const;
