/**
 * API handlers, gathered into the shape `server/index.ts` registers.
 *
 * The handlers themselves live one directory down, split by area so two people can
 * work at once without landing in the same file. The to-do list is `ApiClient` in
 * `shared/api.ts`: every operation there has an entry here, returning exactly the
 * shape the contract declares.
 *
 * Each handler is a plain function that returns its payload and throws on failure;
 * `route()` from `server/lib.ts` turns that into a `Response` and every failure
 * into `{ error }`, the shape `src/api.ts` relies on. Queries go through Drizzle
 * but stay synchronous (`.all()` / `.get()` / `.run()`), so only the two handlers
 * that read a JSON body are async.
 *
 * Two behaviours are not optional, because `src/mocks/client.ts` already has them
 * and the two implementations must be indistinguishable:
 *
 *   - Score is computed from `position` on read via `scoreForPosition()`. Never
 *     store a score column.
 *   - `visibleTypes(pref)` gates every read and write except `GET /api/feed` and
 *     `Profile.top`, which cross types and flag `can_use`. Rejecting a bookmark
 *     outside the gate is the server's job, not the screen's.
 */

import { route } from "./lib";
import * as catalogue from "./handlers/catalogue";
import * as rankings from "./handlers/rankings";
import * as saved from "./handlers/saved";
import * as session from "./handlers/session";
import * as social from "./handlers/social";

export const handlers = {
  register: route(session.register),
  login: route(session.login),
  me: route(session.me),
  updateProfile: route(session.updateProfile),

  listBathrooms: route(catalogue.listBathrooms),
  getBathroom: route<"/api/bathrooms/:id">(catalogue.getBathroom),

  listMyRankings: route(rankings.listMyRankings),
  submitReview: route(rankings.submitReview),

  listBookmarks: route(saved.listBookmarks),
  putBookmark: route<"/api/bookmarks/:id">(saved.putBookmark),
  deleteBookmark: route<"/api/bookmarks/:id">(saved.deleteBookmark),

  listWantToGo: route(saved.listWantToGo),
  putWantToGo: route<"/api/want-to-go/:id">(saved.putWantToGo),
  deleteWantToGo: route<"/api/want-to-go/:id">(saved.deleteWantToGo),

  listFeed: route(social.listFeed),
  searchUsers: route(social.searchUsers),
  putFollow: route<"/api/users/:id/follow">(social.putFollow),
  deleteFollow: route<"/api/users/:id/follow">(social.deleteFollow),

  myProfile: route(social.myProfile),
  profileOf: route<"/api/profile/:id">(social.profileOf),
};
