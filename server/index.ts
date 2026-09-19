/**
 * Server entry: static frontend + API, one process, one port.
 *
 * Deliberately thin. Endpoint logic lives in `routes.ts`, the schema lives in
 * `db.ts`, and the URLs come from the shared contract — so this file should
 * barely change all weekend.
 *
 * ⚠️ No API routes are registered yet: the handlers in `routes.ts` haven't been
 * written against the püpi contract. That's fine for now — the frontend runs on
 * `src/mocks/` by default, so `bun dev` serves a fully working app. Adding
 * `?mock=0` to the URL is what needs these routes.
 *
 * To wire one up, register its pattern from `routePatterns` — they're already
 * defined in `shared/api.ts`, so the client and server can't disagree about a path:
 *
 *   [routePatterns.bathrooms]: { GET: handlers.listBathrooms },
 *   [routePatterns.reviews]:   { POST: handlers.submitReview },
 */

import { serve } from "bun";
import index from "../src/index.html";
import "./contract"; // type-only: fails typecheck if the schema drifts from shared/api.ts

const server = serve({
  port: Number(process.env.PORT ?? 3000),

  routes: {
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
