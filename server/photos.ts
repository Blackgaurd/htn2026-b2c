/**
 * An in-process object store for review photos.
 *
 * The contract types `photos` as `string[]` and the screens put each string
 * straight into an `<img src>`. The frontend sends **data URLs**, the whole
 * image base64'd inline, and that is the wrong thing to put in SQLite: a couple
 * of phone photos is several megabytes of base64 in a TEXT column, read back in
 * full by every list query that touches the row, including the feed.
 *
 * So the bytes stop here. `store()` decodes a data URL, keeps the bytes in a Map
 * in this process, and hands back a short reference URL (`/api/photos/<id>`).
 * That reference is what the review row holds, and `GET /api/photos/:id` serves
 * the bytes back. An `<img src>` can't tell the difference, so no screen changes
 * and `shared/api.ts` is untouched: the frontend never constructs this URL, it
 * only echoes back what the API handed it.
 *
 * ⚠️ **In-process means exactly that: the photos die with the server.** The rows
 * in `data.db` outlive them, so after a restart a review still lists its photo
 * URLs and every one of them 404s. That's the deal a Map buys you, and for a
 * hackathon it's the right trade: no upload dir, no blob column, no cleanup job.
 * Making photos survive a restart means writing the bytes somewhere real, at
 * which point `store()` is the one function that changes.
 *
 * Ids are a content hash, so submitting the same photo twice costs one entry.
 */

const BY_ID = new Map<string, { bytes: Uint8Array; type: string }>();

/** `data:image/jpeg;base64,/9j/4AAQ…`, mediatype optional, base64 required. */
const DATA_URL = /^data:([\w.+-]+\/[\w.+-]+)?(?:;[\w-]+=[\w-]+)*;base64,([A-Za-z0-9+/=\s]+)$/;

/** Where a stored photo is served from. Local to the server, not the contract. */
export const PHOTO_ROUTE = "/api/photos/:id";
const photoUrl = (id: string): string => `/api/photos/${id}`;

/** One photo this big is already more than a review needs. */
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Keep the Map from being an unbounded memory leak. Oldest entries are evicted
 * first; a review whose photo got evicted behaves exactly like one from before a
 * restart, which is a case the UI has to tolerate anyway.
 */
const MAX_PHOTOS = 200;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

/**
 * Take one photo string and return what belongs in the database.
 *
 * A data URL is decoded and stored, and its reference URL comes back. Anything
 * else is passed through untouched, on a re-rate the client sends back the
 * `/api/photos/…` URLs it was given, and those must not be re-stored.
 *
 * Throws on a malformed or oversized data URL so a bad upload is a 400 the user
 * can act on, rather than a broken image discovered later.
 */
export function store(photo: string): string {
  if (typeof photo !== "string" || photo === "") {
    throw new Error("a photo must be a data URL string");
  }
  if (!photo.startsWith("data:")) return photo;

  const match = DATA_URL.exec(photo);
  if (!match) throw new Error("photos must be base64 data URLs");

  const type = match[1] ?? "image/jpeg";
  if (!ALLOWED.has(type)) throw new Error(`${type} isn't an image format we store`);

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.fromBase64(match[2]!.replace(/\s/g, ""));
  } catch {
    throw new Error("that photo isn't valid base64");
  }
  if (bytes.byteLength === 0) throw new Error("that photo is empty");
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error(`photos must be under ${Math.floor(MAX_BYTES / 1024 / 1024)}MB`);
  }

  // Content-addressed: the same image submitted twice is one entry, and a
  // re-rate that re-sends the original data URL lands on the id it already had.
  const id = new Bun.CryptoHasher("sha256").update(bytes).digest("hex").slice(0, 32);

  if (!BY_ID.has(id)) {
    if (BY_ID.size >= MAX_PHOTOS) {
      const oldest = BY_ID.keys().next();
      if (!oldest.done) BY_ID.delete(oldest.value);
    }
    BY_ID.set(id, { bytes, type });
  }
  return photoUrl(id);
}

/** Serve one stored photo. 404 once the process has restarted, see the note above. */
export function serve(req: Request & { params: { id: string } }): Response {
  const found = BY_ID.get(req.params.id);
  if (!found) {
    return Response.json({ error: "that photo is no longer here" }, { status: 404 });
  }
  return new Response(found.bytes as BlobPart, {
    headers: {
      "content-type": found.type,
      // Content-addressed, so a given id's bytes can never change.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

/** For tests and for `GET /api/photos` style debugging. */
export const photoCount = (): number => BY_ID.size;
