/**
 * Server entry: static frontend + API, one process, one port.
 *
 * Deliberately thin. Endpoint logic lives in `routes.ts`, the schema lives in
 * `db.ts`, and the URLs come from the shared contract — so this file should
 * barely change all weekend.
 */

import { serve } from "bun";
import index from "../src/index.html";
import { routePatterns } from "../shared/api";
import { handlers } from "./routes";

const server = serve({
  port: Number(process.env.PORT ?? 3000),

  routes: {
    [routePatterns.items]: {
      GET: handlers.listItems,
      POST: handlers.createItem,
    },
    [routePatterns.item]: {
      PATCH: handlers.updateItem,
      DELETE: handlers.deleteItem,
    },

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
