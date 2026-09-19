/**
 * The fixture-backed `ApiClient`. Stands in for the whole backend.
 *
 * Writes are real: create / toggle / delete mutate an in-memory copy of
 * `data.ts`, so the UI behaves like it's talking to a database. State lives for
 * the life of the page — a reload puts the fixtures back, which is the fastest
 * possible reset.
 *
 * Behaviour mirrors `server/routes.ts` where it's observable: newest id first,
 * and a miss throws the same `no item N` message the HTTP client surfaces from a
 * 404, so a screen's error branch is exercised honestly. No latency simulation,
 * no injected failures.
 */

import type { ApiClient, Item } from "../../shared/api";
import { items } from "./data";

/** Mutable session copy — the fixtures themselves are never touched. */
let rows: Item[] = items.map(item => ({ ...item }));

/** Matches SQLite's `datetime('now')`: UTC, "YYYY-MM-DD HH:MM:SS". */
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

const find = (id: number): Item => {
  const row = rows.find(item => item.id === id);
  if (!row) throw new Error(`no item ${id}`);
  return row;
};

export const mockClient: ApiClient = {
  async listItems() {
    return [...rows].sort((a, b) => b.id - a.id);
  },

  async createItem(title) {
    const value = title.trim();
    if (!value) throw new Error("title is required");

    const created: Item = {
      id: rows.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      title: value,
      done: false,
      created_at: now(),
    };
    rows.push(created);
    return created;
  },

  async toggleItem(id, done) {
    const row = find(id);
    row.done = done;
    return { ...row };
  },

  async deleteItem(id) {
    find(id);
    rows = rows.filter(item => item.id !== id);
    return { id };
  },
};
