/**
 * Presentation helpers for the püpi design — colours, labels and badges.
 *
 * Pure functions over contract types. Nothing here fetches, and nothing here
 * decides what a user is allowed to see — that's `visibleTypes` in the contract.
 *
 * The hex values are the Figma palette. They're repeated as literals rather than
 * Tailwind classes because the design leans on them for gradients, alpha suffixes
 * and inline bar fills, where a class name can't reach.
 */

import type { Bathroom, Building, WashroomType } from "../../shared/api";
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
 * bathroom shows this badge — it is the whole reason the friends feed is safe to
 * show across types.
 */
export const washroomMeta: Record<
  WashroomType,
  { label: string; short: string; color: string; bg: string; icon: string }
> = {
  female: { label: "Women's", short: "W", color: "#E87DB8", bg: "#FDE8F3", icon: "♀" },
  male: { label: "Men's", short: "M", color: "#5B8FE8", bg: "#EBF1FD", icon: "♂" },
  universal: { label: "All-Gender", short: "U", color: "#9B78D4", bg: "#F0EBF9", icon: "⚧" },
};

/** What each preference gets you, spelled out on the register screen. */
export const prefBlurb: Record<WashroomType, string> = {
  female: "See Women's & All-Gender washrooms",
  male: "See Men's & All-Gender washrooms",
  universal: "See All-Gender washrooms only",
};

export function scoreColor(score: number): string {
  if (score >= 9) return "#3DBF82";
  if (score >= 7) return "#5B8FE8";
  if (score >= 5) return "#F5A623";
  return "#ADADBE";
}

export function scoreLabel(score: number): string {
  if (score >= 9) return "Excellent";
  if (score >= 7) return "Good";
  if (score >= 5) return "Okay";
  return "Poor";
}

export const buildingColor = (building: Building): string =>
  building === "E5" ? "#7B8CDE" : "#5EC4A8";

/** The five rating categories as the UI presents them, in order. */
export const categoryMeta = [
  { key: "cleanliness", label: "Cleanliness", icon: "🧹", desc: "How clean was it overall?" },
  { key: "accessibility", label: "Accessibility", icon: "♿", desc: "Ease of access and navigation" },
  { key: "hygiene", label: "Hygiene Products", icon: "🧴", desc: "Soap, paper, hand dryers" },
  { key: "privacy", label: "Privacy", icon: "🔒", desc: "Stall quality, door gaps, noise" },
  { key: "smell", label: "Smell", icon: "🌿", desc: "Odour level and ventilation" },
] as const;

export const STAR_LABELS = ["", "Poor", "Fair", "Good", "Great", "Perfect"] as const;

/** "E7 3rd Floor — North Wing, beside the stairwell" */
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
