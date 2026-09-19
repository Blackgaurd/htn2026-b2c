/**
 * THE CATALOGUE — every washroom in E5 and E7, fixed at build time.
 *
 * This is the app's one hard rule made concrete: users pick from this list, they
 * never add to it. There is no create-bathroom endpoint and no free-text bathroom
 * field anywhere in the UI.
 *
 * The rows themselves live in `catalogue.yaml` so the list is editable as data —
 * see the header there, and `bun run db:catalogue` to apply an edit. Bun parses
 * `.yaml` imports in the runtime *and* inlines them at bundle time, so there is no
 * build step: `server/seed.ts`, `src/mocks/data.ts` and the browser all read that
 * one file. `bun --hot` picks up an edit without a restart.
 *
 * This file is what makes that safe. A YAML import arrives as `any`, so nothing
 * would stop `washroom_type: femail` from shipping and quietly breaking the gender
 * gate. `parseCatalogue()` is the trade: the compiler stops checking the rows, and
 * this throws on them instead — loudly, at import, naming the row.
 *
 * Imports nothing but the contract's types. Safe in the browser bundle.
 *
 * ⚠️ The rooms are plausible but NOT surveyed — placeholders in the right shape,
 * waiting on the real E5/E7 audit. Ids are the only thing worth keeping stable,
 * since reviews point at them.
 */

import rows from "./catalogue.yaml";
import type { BathroomRow, Building, WashroomType } from "./api";

const BUILDINGS: readonly Building[] = ["E5", "E7"];
const TYPES: readonly WashroomType[] = ["female", "male", "universal"];

/**
 * Validate the YAML into real `BathroomRow`s, or throw saying which row and why.
 *
 * Exported so `bun run db:catalogue` can report a bad edit the same way — and so
 * it's testable without a database.
 */
export function parseCatalogue(input: unknown): BathroomRow[] {
  if (!Array.isArray(input)) {
    throw new Error("catalogue.yaml must be a list of washrooms");
  }

  const seen = new Set<number>();
  return input.map((raw, index) => {
    // `index` is the position in the file, `id` the row's own number — a bad row
    // may be missing the id entirely, so the message leads with the position.
    const where = `catalogue.yaml row ${index + 1}`;
    if (typeof raw !== "object" || raw === null) {
      throw new Error(`${where}: expected a mapping, got ${JSON.stringify(raw)}`);
    }
    const row = raw as Record<string, unknown>;
    const { id, building, floor, location, washroom_type, accessible } = row;

    if (!Number.isInteger(id) || (id as number) < 1) {
      throw new Error(`${where}: id must be a positive whole number, got ${JSON.stringify(id)}`);
    }
    if (seen.has(id as number)) {
      throw new Error(`${where}: id ${id} is already used — ids must be unique and stable`);
    }
    seen.add(id as number);

    if (!BUILDINGS.includes(building as Building)) {
      throw new Error(`${where} (id ${id}): building must be one of ${BUILDINGS.join(", ")}, got ${JSON.stringify(building)}`);
    }
    if (!Number.isInteger(floor) || (floor as number) < 1) {
      throw new Error(`${where} (id ${id}): floor must be a positive whole number, got ${JSON.stringify(floor)}`);
    }
    if (typeof location !== "string" || location.trim() === "") {
      throw new Error(`${where} (id ${id}): location must be a non-empty string, got ${JSON.stringify(location)}`);
    }
    if (!TYPES.includes(washroom_type as WashroomType)) {
      throw new Error(`${where} (id ${id}): washroom_type must be one of ${TYPES.join(", ")}, got ${JSON.stringify(washroom_type)}`);
    }
    if (typeof accessible !== "boolean") {
      throw new Error(`${where} (id ${id}): accessible must be true or false, got ${JSON.stringify(accessible)}`);
    }

    return {
      id: id as number,
      building: building as Building,
      floor: floor as number,
      location: location.trim(),
      washroom_type: washroom_type as WashroomType,
      accessible,
    };
  });
}

export const CATALOGUE: readonly BathroomRow[] = parseCatalogue(rows);

const ORDINALS = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"] as const;

export function floorOrdinal(floor: number): string {
  return ORDINALS[floor] ?? `${floor}th`;
}

/** "E7 3rd Floor — North Wing, beside the stairwell" — built, never stored. */
export function fullLocation(b: Pick<BathroomRow, "building" | "floor" | "location">): string {
  return `${b.building} ${floorOrdinal(b.floor)} Floor — ${b.location}`;
}

/** Every floor present in the catalogue, ascending. Drives the floor filter chips. */
export const CATALOGUE_FLOORS: readonly number[] = [
  ...new Set(CATALOGUE.map(b => b.floor)),
].sort((a, b) => a - b);
