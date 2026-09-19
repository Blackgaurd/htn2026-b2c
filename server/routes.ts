/**
 * API handlers. Backend territory — this is the file the backend person lives in.
 *
 * Every handler returns something matching the contract in `shared/api.ts`.
 * Nothing here knows React exists.
 *
 * Queries go through Drizzle but stay synchronous (`.all()` / `.get()` / `.run()`),
 * and `done` is already a real boolean thanks to the column's `mode: "boolean"` —
 * so rows serialize straight to JSON with no mapping step.
 */

import type { BunRequest } from "bun";
import { desc, eq } from "drizzle-orm";
import type { CreateItemBody, UpdateItemBody } from "../shared/api";
import { db } from "./db";
import { items } from "./schema";

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
    return Response.json(db.select().from(items).orderBy(desc(items.id)).all());
  },

  async createItem(req: BunRequest) {
    const body = await readJson<CreateItemBody>(req);
    const title = body?.title?.trim();
    if (!title) return fail(400, "title is required");

    const row = db.insert(items).values({ title }).returning().get();
    if (!row) return fail(500, "insert failed");
    return Response.json(row, { status: 201 });
  },

  async updateItem(req: BunRequest<"/api/items/:id">) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(400, "invalid id");

    const body = await readJson<UpdateItemBody>(req);
    if (typeof body?.done !== "boolean") return fail(400, "done must be a boolean");

    const row = db.update(items).set({ done: body.done }).where(eq(items.id, id)).returning().get();
    if (!row) return fail(404, `no item ${id}`);
    return Response.json(row);
  },

  async deleteItem(req: BunRequest<"/api/items/:id">) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(400, "invalid id");

    const row = db.delete(items).where(eq(items.id, id)).returning().get();
    if (!row) return fail(404, `no item ${id}`);
    return Response.json({ id: row.id });
  },
};
