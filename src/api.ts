/**
 * The only frontend file that knows HTTP exists.
 *
 * Components import these functions and get typed `Item`s back. They cannot see
 * URLs, fetch, status codes, or SQL — so the backend can reshape any of that
 * without touching a component.
 */

import type { ApiError, CreateItemBody, Item, UpdateItemBody } from "../shared/api";
import { paths } from "../shared/api";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.error ?? `${init?.method ?? "GET"} ${url} → ${res.status}`);
  }
  return (await res.json()) as T;
}

const send = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const listItems = (): Promise<Item[]> => request<Item[]>(paths.items);

export const createItem = (title: string): Promise<Item> =>
  request<Item>(paths.items, send("POST", { title } satisfies CreateItemBody));

export const toggleItem = (id: number, done: boolean): Promise<Item> =>
  request<Item>(paths.item(id), send("PATCH", { done } satisfies UpdateItemBody));

export const deleteItem = (id: number): Promise<{ id: number }> =>
  request<{ id: number }>(paths.item(id), { method: "DELETE" });
