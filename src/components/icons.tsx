/**
 * The icon set: the five bottom-bar glyphs, the bookmark, and the star.
 *
 * Deliberately a short list. These are the ones that label a destination you tap
 * dozens of times or an input you're actually manipulating, everywhere else,
 * buttons still say what they do in words.
 *
 * `active` fills the shape with the light accent rather than swapping icons, so a
 * tab doesn't appear to change what it is when you select it.
 */

const ACTIVE = "#7B8CDE";
const IDLE = "#ADADBE";
const ACTIVE_FILL = "#EEF0FB";

type TabIconProps = { active?: boolean };

export function HomeIcon({ active }: TabIconProps) {
  const c = active ? ACTIVE : IDLE;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        fill={active ? ACTIVE_FILL : "none"}
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 21V12h6v9" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Map pin, Near me. */
export function PinIcon({ active }: TabIconProps) {
  const c = active ? ACTIVE : IDLE;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s7-5.686 7-11a7 7 0 10-14 0c0 5.314 7 11 7 11z"
        fill={active ? ACTIVE_FILL : "none"}
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke={c} strokeWidth="1.8" fill="none" />
    </svg>
  );
}

export function TrophyIcon({ active }: TabIconProps) {
  const c = active ? ACTIVE : IDLE;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 3h8v8a4 4 0 01-8 0V3z"
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? ACTIVE_FILL : "none"}
      />
      <path d="M5 4H3v3a3 3 0 003 3M19 4h2v3a3 3 0 01-3 3" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 15v3M8 21h8" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ProfileIcon({ active }: TabIconProps) {
  const c = active ? ACTIVE : IDLE;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" fill={active ? ACTIVE_FILL : "none"} />
      <path d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function BackIcon({ size = 18, color = "#4A57A6" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5M11 18l-6-6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ size = 14, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4.5 4.5L19 7" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BookmarkIcon({ filled, size = 20 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3h14a1 1 0 011 1v17l-8-4-8 4V4a1 1 0 011-1z"
        fill={filled ? ACTIVE : "none"}
        stroke={filled ? ACTIVE : IDLE}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The rating control. Not decoration, a row of five of these is the input
 * itself, which is why it survived when the rest of the drawn icons went.
 */
export function StarIcon({
  filled,
  size = 18,
  color = "#D99414",
}: {
  filled: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? color : "none"}
        stroke={filled ? color : "#D8D5CE"}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
