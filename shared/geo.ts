/**
 * Where the buildings are, for the Near me screen.
 *
 * Coordinates are per *building*, not per washroom: every washroom in E7 is the
 * same place as far as a phone's GPS is concerned, and pretending otherwise would
 * be inventing precision that doesn't exist. Floors don't move you on a map.
 *
 * ⚠️ Approximate, like the catalogue rooms themselves, close enough to order two
 * buildings correctly, not survey data. Replace alongside the real audit.
 *
 * Imports nothing but the contract's types. Safe in the browser bundle.
 */

import type { Building } from "./api";

export type Coords = { lat: number; lng: number };

export const BUILDING_COORDS: Record<Building, Coords> = {
  E5: { lat: 43.4726, lng: -80.5397 },
  E7: { lat: 43.4732, lng: -80.5393 },
};

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. Haversine, fine at campus scale. */
export function distanceMetres(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** "120 m" / "1.4 km", short enough for a list row. */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}
