/**
 * THE CATALOGUE — every washroom in E5 and E7, fixed at build time.
 *
 * This is the app's one hard rule made concrete: users pick from this list, they
 * never add to it. There is no create-bathroom endpoint and no free-text bathroom
 * field anywhere in the UI.
 *
 * It lives in `shared/` because both halves need the exact same rows and neither
 * may import from the other: `server/seed.ts` writes these into `data.db`, and
 * `src/mocks/data.ts` serves them straight to the browser. One list, one set of ids,
 * so a mock demo and a live demo show the same bathrooms.
 *
 * Imports nothing but the contract's types. Safe in the browser bundle.
 *
 * ⚠️ The rooms below are plausible but NOT surveyed — placeholders in the right
 * shape. Replace them with the real audit; ids are the only thing worth keeping
 * stable, since reviews point at them.
 */

import type { BathroomRow } from "./api";

/**
 * `location` is the detail only ("Main Entrance, left of elevator"). The building
 * and floor prefix is composed for display by `fullLocation()` — storing it twice
 * is how you end up with a regex stripping it back off.
 */
export const CATALOGUE: readonly BathroomRow[] = [
  // ─── E5 ─────────────────────────────────────────────────────────────────────
  { id: 1, building: "E5", floor: 1, location: "Main Entrance, left of the elevator", washroom_type: "female", accessible: false },
  { id: 2, building: "E5", floor: 1, location: "Main Entrance, right of the elevator", washroom_type: "male", accessible: false },
  { id: 3, building: "E5", floor: 1, location: "Main Entrance, past the coat racks", washroom_type: "universal", accessible: true },
  { id: 4, building: "E5", floor: 2, location: "North Wing, across from 2118", washroom_type: "female", accessible: false },
  { id: 5, building: "E5", floor: 2, location: "North Wing, beside lab 2114", washroom_type: "male", accessible: false },
  { id: 6, building: "E5", floor: 3, location: "South Wing, across from 3009", washroom_type: "female", accessible: true },
  { id: 7, building: "E5", floor: 3, location: "South Wing, near 3012", washroom_type: "male", accessible: false },
  { id: 8, building: "E5", floor: 4, location: "Central Hub, beside the kitchenette", washroom_type: "universal", accessible: true },
  { id: 9, building: "E5", floor: 4, location: "East Corridor, near 4025", washroom_type: "female", accessible: false },
  { id: 10, building: "E5", floor: 4, location: "East Corridor, near 4021", washroom_type: "male", accessible: false },
  { id: 11, building: "E5", floor: 5, location: "Student Design Centre, upper mezzanine", washroom_type: "female", accessible: false },
  { id: 12, building: "E5", floor: 5, location: "Student Design Centre, upper mezzanine", washroom_type: "male", accessible: false },
  { id: 13, building: "E5", floor: 6, location: "Rooftop Lounge, beside the stairwell", washroom_type: "universal", accessible: false },

  // ─── E7 ─────────────────────────────────────────────────────────────────────
  { id: 14, building: "E7", floor: 1, location: "Atrium, east side", washroom_type: "universal", accessible: true },
  { id: 15, building: "E7", floor: 1, location: "Atrium, beneath the north stairs", washroom_type: "female", accessible: false },
  { id: 16, building: "E7", floor: 1, location: "Atrium, beneath the north stairs", washroom_type: "male", accessible: false },
  { id: 17, building: "E7", floor: 2, location: "West Corridor, near 2107", washroom_type: "female", accessible: false },
  { id: 18, building: "E7", floor: 2, location: "West Corridor, near 2103", washroom_type: "male", accessible: false },
  { id: 19, building: "E7", floor: 3, location: "North Wing, across from 3220", washroom_type: "female", accessible: false },
  { id: 20, building: "E7", floor: 3, location: "North Wing, beside the stairwell", washroom_type: "male", accessible: false },
  { id: 21, building: "E7", floor: 4, location: "Research Wing, room 4023", washroom_type: "universal", accessible: true },
  { id: 22, building: "E7", floor: 4, location: "Research Wing, near the elevator bank", washroom_type: "male", accessible: false },
  { id: 23, building: "E7", floor: 5, location: "South Pod, near the elevator bank", washroom_type: "universal", accessible: false },
  { id: 24, building: "E7", floor: 5, location: "South Pod, west end", washroom_type: "female", accessible: false },
  { id: 25, building: "E7", floor: 6, location: "Ideas Clinic overlook, north end", washroom_type: "female", accessible: false },
  { id: 26, building: "E7", floor: 6, location: "Ideas Clinic overlook, north end", washroom_type: "male", accessible: false },
  { id: 27, building: "E7", floor: 7, location: "Top floor terrace, beside 7302", washroom_type: "universal", accessible: true },
];

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
