/**
 * Demo screen — one working end-to-end path through every layer:
 *
 *   component → src/api.ts → HTTP → server/routes.ts → bun:sqlite
 *
 * Frontend territory. Replace with your real screens; keep the shape (talk to
 * `../api`, never to fetch or SQL directly).
 */

import { type FormEvent, useEffect, useState } from "react";
import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import type { Item } from "../../shared/api";
import { createItem, deleteItem, listItems, toggleItem } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ItemsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    try {
      setError(null);
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    run(async () => setItems(await listItems())).finally(() => setLoading(false));
  }, []);

  const onAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setTitle("");
    run(async () => {
      const created = await createItem(value);
      setItems(prev => [created, ...prev]);
    });
  };

  const onToggle = (item: Item) =>
    run(async () => {
      const updated = await toggleItem(item.id, !item.done);
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
    });

  const onDelete = (item: Item) =>
    run(async () => {
      await deleteItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
    });

  return (
    <div className="flex h-full flex-col">
      <header className="flex-none px-5 pb-3 pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Items</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${items.filter(i => !i.done).length} open`}
        </p>
      </header>

      {error && (
        <p className="mx-5 mb-2 flex-none rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-4">
        {loading && (
          <li className="grid place-items-center py-10 text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" />
          </li>
        )}

        {!loading && items.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">
            Nothing yet. Add something below.
          </li>
        )}

        {items.map(item => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 text-card-foreground"
          >
            <button
              type="button"
              onClick={() => onToggle(item)}
              aria-label={item.done ? `Mark "${item.title}" open` : `Mark "${item.title}" done`}
              className={`grid size-6 flex-none place-items-center rounded-full border transition-colors ${
                item.done ? "border-primary bg-primary text-primary-foreground" : "border-input"
              }`}
            >
              {item.done && <Check className="size-3.5" />}
            </button>

            <span className={`flex-1 text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}>
              {item.title}
            </span>

            <button
              type="button"
              onClick={() => onDelete(item)}
              aria-label={`Delete "${item.title}"`}
              className="flex-none text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={onAdd} className="flex flex-none gap-2 border-t bg-background p-4">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Add an item…"
          aria-label="New item title"
        />
        <Button type="submit" size="icon" aria-label="Add item">
          <Plus className="size-4" />
        </Button>
      </form>
    </div>
  );
}
