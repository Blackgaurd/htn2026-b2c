/**
 * THE CONTRACT — owned by the frontend.
 *
 * The frontend declares the shape it needs here; the backend's job is to catch up
 * and serve exactly that. A field in this file that `data.db` doesn't have yet is a
 * backend to-do, not a frontend bug — don't narrow it to match what the server
 * currently returns. Changing it breaks the other half's build instantly (which is
 * the point, but say it out loud before you do it).
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

/**
 * Every operation the frontend can perform.
 *
 * Two implementations satisfy it — the HTTP client in `src/api.ts` and the mock
 * client in `src/mocks/client.ts` — so they can never drift apart, and components
 * can't tell which one they got. It doubles as the backend's to-do list: an
 * operation here with no handler in `server/routes.ts` is work not done yet.
 */
export type ApiClient = {
  listItems(): Promise<Item[]>;
  createItem(title: string): Promise<Item>;
  toggleItem(id: number, done: boolean): Promise<Item>;
  deleteItem(id: number): Promise<{ id: number }>;
};
