/**
 * Server entry: static frontend + API, one process, one port.
 *
 * Deliberately thin. Endpoint logic lives in `routes.ts`, the schema lives in
 * `db.ts`, and the URLs come from the shared contract, so this file should
 * barely change all weekend.
 *
 * Every path comes from `routePatterns` in `shared/api.ts`, so the client and the
 * server cannot disagree about a URL: `src/api.ts` builds the same strings from
 * the `paths` builders right beside them.
 *
 * The frontend still runs on `src/mocks/` by default; `?mock=0` is what reaches
 * these routes.
 */

import { serve } from "bun";
import index from "../src/index.html";
import { routePatterns } from "../shared/api";
import { PHOTO_ROUTE, serve as servePhoto } from "./photos";
import { handlers } from "./routes";
import "./contract"; // type-only: fails typecheck if the schema drifts from shared/api.ts

const server = serve({
  port: Number(process.env.PORT ?? 3000),

  routes: {
    [routePatterns.register]: { POST: handlers.register },
    [routePatterns.login]: { POST: handlers.login },
    [routePatterns.me]: { GET: handlers.me, PATCH: handlers.updateProfile },

    [routePatterns.bathrooms]: { GET: handlers.listBathrooms },
    [routePatterns.bathroom]: { GET: handlers.getBathroom },

    [routePatterns.rankings]: { GET: handlers.listMyRankings },
    [routePatterns.reviews]: { POST: handlers.submitReview },

    [routePatterns.bookmarks]: { GET: handlers.listBookmarks },
    [routePatterns.bookmark]: { PUT: handlers.putBookmark, DELETE: handlers.deleteBookmark },
    [routePatterns.wantToGo]: { GET: handlers.listWantToGo },
    [routePatterns.wantToGoItem]: { PUT: handlers.putWantToGo, DELETE: handlers.deleteWantToGo },

    [routePatterns.feed]: { GET: handlers.listFeed },
    [routePatterns.users]: { GET: handlers.searchUsers },
    [routePatterns.follow]: { PUT: handlers.putFollow, DELETE: handlers.deleteFollow },
    [routePatterns.profile]: { GET: handlers.myProfile },
    [routePatterns.profileOf]: { GET: handlers.profileOf },

    // Review photos. Deliberately NOT in `routePatterns`: the frontend never
    // builds this URL, it only renders the one the API already handed it inside
    // a review's `photos`. See `server/photos.ts`.
    [PHOTO_ROUTE]: { GET: servePhoto },

    // Catch-all: hand every non-API request to the React app so client-side
    // routing works on refresh. Keep this last.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 ${server.url}`);
