/**
 * Presentation helpers for the püpi design, colours, labels and badges.
 *
 * Pure functions over contract types. Nothing here fetches, and nothing here
 * decides what a user is allowed to see, that's `visibleTypes` in the contract.
 *
 * The hex values are the Figma palette. They're repeated as literals rather than
 * Tailwind classes because the design leans on them for gradients, alpha suffixes
 * and inline bar fills, where a class name can't reach.
 */

import type { Bathroom, WashroomType } from "../../shared/api";
import { fullLocation } from "../../shared/catalogue";

export const palette = {
  bg: "#F7F5F1",
  card: "#FFFFFF",
  charcoal: "#1C1C2E",
  muted: "#6B6B7E",
  faint: "#ADADBE",
  border: "#ECEAE4",
  periwinkle: "#7B8CDE",
  periwinkleLight: "#EEF0FB",
  periwinkleMid: "#C5CBEF",
  violet: "#9B78D4",
  violetLight: "#F0EBF9",
  mint: "#5EC4A8",
  mintLight: "#E6F7F3",
} as const;

export const gradient = {
  primary: "linear-gradient(135deg, #7B8CDE 0%, #9B78D4 100%)",
  brand: "linear-gradient(135deg, #7B8CDE 0%, #5EC4A8 100%)",
  wash: "linear-gradient(160deg, #EEF0FB 0%, #F0EBF9 100%)",
  celebrate: "linear-gradient(160deg, #EEF0FB 0%, #E6F7F3 100%)",
  dark: "linear-gradient(135deg, #1C1C2E 0%, #3B3B52 100%)",
} as const;

/**
 * How each washroom type is named and coloured. Every surface that shows a
 * bathroom shows this badge, it is the whole reason the friends feed is safe to
 * show across types.
 */
export const washroomMeta: Record<
  WashroomType,
  { label: string; color: string; bg: string }
> = {
  female: { label: "Women's", color: "#C2568F", bg: "#FBEAF3" },
  male: { label: "Men's", color: "#4A7BC8", bg: "#EAF1FC" },
  universal: { label: "All-Gender", color: "#7B62B8", bg: "#EFEBF8" },
};

/** What each preference gets you, spelled out on the register screen. */
export const prefBlurb: Record<WashroomType, string> = {
  female: "See Women's & All-Gender washrooms",
  male: "See Men's & All-Gender washrooms",
  universal: "See All-Gender washrooms only",
};

/**
 * Green, yellow, red. Three tiers and no more, a score is the one number in the
 * app, so it gets one colour scale and nothing else competes with it.
 */
export const scoreScale = {
  good: "#2FA36B",
  ok: "#D99414",
  bad: "#D2544F",
} as const;

export function scoreColor(score: number): string {
  if (score >= 7) return scoreScale.good;
  if (score >= 4) return scoreScale.ok;
  return scoreScale.bad;
}

export function scoreLabel(score: number): string {
  if (score >= 7) return "Good";
  if (score >= 4) return "Okay";
  return "Bad";
}

/**
 * Labels for the optional detail ratings.
 *
 * No icons: a broom, a wheelchair, a bottle and a padlock in a column was four
 * pictures for four words that were already there.
 */
export const detailMeta: Record<string, { label: string; hint: string }> = {
  cleanliness: { label: "Cleanliness", hint: "How clean was it overall?" },
  accessibility: { label: "Accessibility", hint: "Ease of access and navigation" },
  smell: { label: "Smell", hint: "Odour level and ventilation" },
  hygiene: { label: "Hygiene", hint: "Soap, paper, hand dryers" },
  privacy: { label: "Privacy", hint: "Stall gaps, doors, noise" },
  products: { label: "Sanitary products", hint: "Stocked and available" },
};

/** What each star means while you're picking one. */
export const STAR_LABELS = ["", "Awful", "Bad", "Fine", "Great", "Perfect"] as const;

/** "E7 3rd Floor · North Wing, beside the stairwell" */
export const locationOf = (bathroom: Bathroom): string => fullLocation(bathroom);

/** Initials for an avatar chip: "Maya Rahman" → "MR". */
export function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** "2h ago" / "3d ago" from a UTC "YYYY-MM-DD HH:MM:SS" stamp. */
export function timeAgo(stamp: string): string {
  const then = Date.parse(stamp.replace(" ", "T") + "Z");
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}
