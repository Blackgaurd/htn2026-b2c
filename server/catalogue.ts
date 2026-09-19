/**
 * Push `shared/catalogue.yaml` into the `bathrooms` table: `bun run db:catalogue`.
 *
 * This is the *only* way a washroom gets into the database. Users never create
 * them, there is no create-bathroom endpoint, and no handler inserts here. To
 * add, correct or retire a room you edit the YAML and run this.
 *
 * Upserts by id rather than wiping, so applying an edit doesn't cost you the
 * accounts and reviews you made while testing. Ids are the stable part: reviews
 * point at them, so renumbering a row silently moves somebody's review to a
 * different washroom.
 *
 * Rows in the database whose id is no longer in the YAML are reported, never
 * deleted, a review points at them and a cascade would erase a ranking. Retiring
 * a washroom for real stays a deliberate, manual decision.
 *
 * Requires the tables to exist, run `bun run db:push` first.
 */

import { CATALOGUE } from "../shared/catalogue";
import { db } from "./db";
import { bathrooms } from "./schema";

const existing = new Map(db.select().from(bathrooms).all().map(row => [row.id, row]));

let added = 0;
let updated = 0;
let unchanged = 0;

for (const room of CATALOGUE) {
  const before = existing.get(room.id);
  if (!before) added += 1;
  else if (
    before.building === room.building &&
    before.floor === room.floor &&
    before.location === room.location &&
    before.washroom_type === room.washroom_type &&
    before.accessible === room.accessible
  ) {
    unchanged += 1;
  } else {
    updated += 1;
  }

  db.insert(bathrooms)
    .values(room)
    .onConflictDoUpdate({
      target: bathrooms.id,
      set: {
        building: room.building,
        floor: room.floor,
        location: room.location,
        washroom_type: room.washroom_type,
        accessible: room.accessible,
      },
    })
    .run();
}

const retired = [...existing.keys()].filter(id => !CATALOGUE.some(room => room.id === id));

console.log(
  `${CATALOGUE.length} washrooms synced (${added} new, ${updated} updated, ${unchanged} unchanged)`,
);
if (retired.length > 0) {
  console.log(
    `⚠️  ${retired.length} row(s) in the database are no longer in the catalogue: ${retired.join(", ")}.\n` +
      `   Left in place: reviews may point at them. Delete by hand if you really mean to.`,
  );
}
