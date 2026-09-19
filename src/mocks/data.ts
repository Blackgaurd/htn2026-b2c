/**
 * The fixtures the frontend is built against.
 *
 * Hand-written on purpose: they read like real rows, diff cleanly, and never
 * surprise you between reloads.
 *
 * These are typed as the contract's domain types, which is the whole enforcement
 * mechanism — add a required field to `Item` in `shared/api.ts` and this file
 * stops compiling until it's updated. **When the contract changes, these change in
 * the same commit.** `bun run typecheck` will not let you forget.
 *
 * Keep enough rows to overflow the 390×844 phone frame, and keep a mix of done and
 * open so both visual states render without clicking anything.
 */

import type { Item } from "../../shared/api";

export const items: Item[] = [
  { id: 1, title: "Pitch practice run", done: true, created_at: "2026-09-19 09:02:11" },
  { id: 2, title: "Wire up the submit flow", done: true, created_at: "2026-09-19 09:14:40" },
  { id: 3, title: "Fix the empty state", done: false, created_at: "2026-09-19 10:31:05" },
  { id: 4, title: "Record the demo video", done: false, created_at: "2026-09-19 11:07:52" },
  { id: 5, title: "Swap the placeholder copy", done: false, created_at: "2026-09-19 11:45:19" },
  { id: 6, title: "Shrink the hero image", done: true, created_at: "2026-09-19 12:20:33" },
  { id: 7, title: "Handle the offline case", done: false, created_at: "2026-09-19 13:02:47" },
  { id: 8, title: "Write the README intro", done: false, created_at: "2026-09-19 13:58:04" },
  { id: 9, title: "Check contrast on dark mode", done: false, created_at: "2026-09-19 14:26:12" },
  { id: 10, title: "Book the demo slot", done: true, created_at: "2026-09-19 15:11:29" },
];
