/**
 * The only frontend file that knows HTTP exists — and the switch between the real
 * backend and the fixtures.
 *
 * Components import these functions and get typed `Item`s back. They cannot see
 * URLs, fetch, status codes, SQL, or whether the data came from `data.db` or
 * `src/mocks/` — so the backend can reshape any of that, or not exist yet, without
 * touching a component.
 *
 * Both clients implement `ApiClient` from the contract, so they cannot drift apart.
 * Which one is live comes from the URL — see `src/mocks/enabled.ts`.
 */

import type { ApiClient, ApiError, CreateItemBody, Item, UpdateItemBody } from "../shared/api";
import { paths } from "../shared/api";
import { mockClient } from "./mocks/client";
import { USE_MOCKS } from "./mocks/enabled";

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

const httpClient: ApiClient = {
  listItems: () => request<Item[]>(paths.items),

  createItem: title =>
    request<Item>(paths.items, send("POST", { title } satisfies CreateItemBody)),

  toggleItem: (id, done) =>
    request<Item>(paths.item(id), send("PATCH", { done } satisfies UpdateItemBody)),

  deleteItem: id => request<{ id: number }>(paths.item(id), { method: "DELETE" }),
};

const client: ApiClient = USE_MOCKS ? mockClient : httpClient;

export const { listItems, createItem, toggleItem, deleteItem } = client;
