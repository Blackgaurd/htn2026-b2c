/**
 * Whether the frontend runs on fixtures or on the real API.
 *
 * Mocks are ON by default so screens can be built and demoed with the server
 * stopped. Append `?mock=0` to the URL to hit the real backend instead, no
 * rebuild, and you can keep both open in two tabs to compare.
 *
 * Read from the URL, never `process.env`: this is browser code, and an unset var
 * would ship as a literal `process.env.X` and kill the page. When the backend has
 * caught up for good, flip the default here, it's the one line.
 *
 * The `typeof location` arm is for non-browser importers (a script, `bun test`),
 * where there is no URL to read and fixtures are the only sane answer.
 */

export const USE_MOCKS =
  typeof location === "undefined" ||
  new URLSearchParams(location.search).get("mock") !== "0";
