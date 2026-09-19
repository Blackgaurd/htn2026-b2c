/**
 * The two saved lists, and they are different things, so keep them apart:
 *
 * - a **bookmark** is "saved". It lives on the profile.
 * - **want-to-go** is "I intend to review this". It lives on My list, and drops
 *   off once the user actually reviews the washroom.
 *
 * Both are gender-gated, and the gate *rejects* rather than hides: bookmarking a
 * washroom outside your preference is a 403 here, not something the screen is
 * trusted to prevent. Mirrors `src/mocks/client.ts:371-419`.
 */

import { and, eq } from "drizzle-orm";
import { canUse, type Bathroom } from "../../shared/api";
import { db } from "../db";
import {
  aggregates,
  assertUsable,
  bathroomRow,
  byLocation,
  numericParam,
  requireUser,
  reviewRowsFor,
  toBathroom,
  type UserRow,
} from "../lib";
import { bookmarks, want_to_go } from "../schema";

type IdReq = Request & { params: { id: string } };

/**
 * Saved ids → the rows a list actually renders.
 *
 * The `canUse` filter is defensive: a row saved before the user changed their
 * preference is outside the gate now, and it must not surface. The gate on the
 * write side rejects; on the read side there is nobody to reject, so it hides.
 */
function savedRooms(user: UserRow, bathroomIds: number[]): Bathroom[] {
  const agg = aggregates();
  return bathroomIds
    .map(id => bathroomRow(id))
    .filter(row => canUse(user.washroom_pref, row.washroom_type))
    .sort(byLocation)
    .map(row => toBathroom(row, agg));
}

/** Resolve `:id`, check the gate, and hand back what both toggles need. */
function gatedTarget(req: IdReq): { user: UserRow; id: number } {
  const user = requireUser(req);
  const id = numericParam(req.params.id, "bathroom");
  assertUsable(user, bathroomRow(id));
  return { user, id };
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export function listBookmarks(req: Request): Bathroom[] {
  const user = requireUser(req);
  const rows = db
    .select({ bathroom_id: bookmarks.bathroom_id })
    .from(bookmarks)
    .where(eq(bookmarks.user_id, user.id))
    .all();
  return savedRooms(user, rows.map(r => r.bathroom_id));
}

/** Delete-then-insert, so re-PUTting something already saved is a no-op, not a 409. */
function setBookmark(req: IdReq, on: boolean): { bathroom_id: number; bookmarked: boolean } {
  const { user, id } = gatedTarget(req);

  db.delete(bookmarks)
    .where(and(eq(bookmarks.user_id, user.id), eq(bookmarks.bathroom_id, id)))
    .run();
  if (on) db.insert(bookmarks).values({ user_id: user.id, bathroom_id: id }).run();

  return { bathroom_id: id, bookmarked: on };
}

export function putBookmark(req: IdReq): { bathroom_id: number; bookmarked: boolean } {
  return setBookmark(req, true);
}

export function deleteBookmark(req: IdReq): { bathroom_id: number; bookmarked: boolean } {
  return setBookmark(req, false);
}

// ─── Want to go ───────────────────────────────────────────────────────────────

/**
 * Want-to-go means "I intend to review this", so a washroom the user has already
 * reviewed drops off the list, the intent is spent. Bookmarks do not do this.
 */
export function listWantToGo(req: Request): Bathroom[] {
  const user = requireUser(req);
  const reviewed = new Set(reviewRowsFor(user.id).map(r => r.bathroom_id));

  const rows = db
    .select({ bathroom_id: want_to_go.bathroom_id })
    .from(want_to_go)
    .where(eq(want_to_go.user_id, user.id))
    .all();

  return savedRooms(
    user,
    rows.map(r => r.bathroom_id).filter(id => !reviewed.has(id)),
  );
}

function setWantToGo(req: IdReq, on: boolean): { bathroom_id: number; want_to_go: boolean } {
  const { user, id } = gatedTarget(req);

  db.delete(want_to_go)
    .where(and(eq(want_to_go.user_id, user.id), eq(want_to_go.bathroom_id, id)))
    .run();
  if (on) db.insert(want_to_go).values({ user_id: user.id, bathroom_id: id }).run();

  return { bathroom_id: id, want_to_go: on };
}

export function putWantToGo(req: IdReq): { bathroom_id: number; want_to_go: boolean } {
  return setWantToGo(req, true);
}

export function deleteWantToGo(req: IdReq): { bathroom_id: number; want_to_go: boolean } {
  return setWantToGo(req, false);
}
