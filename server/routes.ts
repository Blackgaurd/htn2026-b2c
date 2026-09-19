/**
 * API handlers. Backend territory — this is the file the backend person lives in.
 *
 * Every handler returns something matching the contract in `shared/api.ts`.
 * Nothing here knows React exists.
 */

import type { BunRequest } from "bun";
import type { CreateItemBody, Item, UpdateItemBody } from "../shared/api";
import { db, type ItemRow } from "./db";

// Statements are prepared once at module load, not per request.
const stmts = {
  list: db.query<ItemRow, []>("SELECT * FROM items ORDER BY id DESC"),
  create: db.query<ItemRow, [string]>("INSERT INTO items (title) VALUES (?) RETURNING *"),
  update: db.query<ItemRow, [number, number]>("UPDATE items SET done = ? WHERE id = ? RETURNING *"),
  remove: db.query<ItemRow, [number]>("DELETE FROM items WHERE id = ? RETURNING *"),
};

const toItem = (row: ItemRow): Item => ({
  id: row.id,
  title: row.title,
  done: row.done === 1,
  created_at: row.created_at,
});

const fail = (status: number, error: string) => Response.json({ error }, { status });

/** Parse a JSON body without throwing on malformed input. */
async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export const handlers = {
  async listItems() {
    return Response.json(stmts.list.all().map(toItem));
  },

  async createItem(req: BunRequest) {
    const body = await readJson<CreateItemBody>(req);
    const title = body?.title?.trim();
    if (!title) return fail(400, "title is required");

    const row = stmts.create.get(title);
    if (!row) return fail(500, "insert failed");
    return Response.json(toItem(row), { status: 201 });
  },

  async updateItem(req: BunRequest<"/api/items/:id">) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(400, "invalid id");

    const body = await readJson<UpdateItemBody>(req);
    if (typeof body?.done !== "boolean") return fail(400, "done must be a boolean");

    const row = stmts.update.get(body.done ? 1 : 0, id);
    if (!row) return fail(404, `no item ${id}`);
    return Response.json(toItem(row));
  },

  async deleteItem(req: BunRequest<"/api/items/:id">) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(400, "invalid id");

    const row = stmts.remove.get(id);
    if (!row) return fail(404, `no item ${id}`);
    return Response.json({ id: row.id });
  },
};
