/**
 * The design's icon set, inlined as SVG.
 *
 * Hand-drawn in Figma rather than pulled from a library, so they're transcribed
 * here verbatim — matching stroke weights and the active/inactive fill trick the
 * tab bar relies on. `lucide-react` is still available for anything new.
 */

export function HomeIcon({ active }: { active?: boolean }) {
  const c = active ? "#7B8CDE" : "#ADADBE";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        fill={active ? "#EEF0FB" : "none"}
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 21V12h6v9" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function TrophyIcon({ active }: { active?: boolean }) {
  const c = active ? "#7B8CDE" : "#ADADBE";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 3h8v8a4 4 0 01-8 0V3z"
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? "#EEF0FB" : "none"}
      />
      <path d="M5 4H3v3a3 3 0 003 3M19 4h2v3a3 3 0 01-3 3" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 15v3M8 21h8" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function FriendsIcon({ active }: { active?: boolean }) {
  const c = active ? "#7B8CDE" : "#ADADBE";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke={c} strokeWidth="1.8" fill={active ? "#EEF0FB" : "none"} />
      <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" stroke={c} strokeWidth="1.8" fill={active ? "#EEF0FB" : "none"} />
      <path d="M21 20c0-2.761-1.791-5-4-5" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ProfileIcon({ active }: { active?: boolean }) {
  const c = active ? "#7B8CDE" : "#ADADBE";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" fill={active ? "#EEF0FB" : "none"} />
      <path d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="#ADADBE" strokeWidth="2" />
      <path d="M16.5 16.5L21 21" stroke="#ADADBE" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="#1C1C2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3h14a1 1 0 011 1v17l-8-4-8 4V4a1 1 0 011-1z"
        fill={filled ? "#7B8CDE" : "none"}
        stroke={filled ? "#7B8CDE" : "#ADADBE"}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarIcon({ filled, color = "#F5A623" }: { filled: boolean; color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? color : "none"}
        stroke={filled ? color : "#ECEAE4"}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon({ size = 10, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2.5 2.5L8 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronDownIcon({ open }: { open?: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
    >
      <path d="M2 4l4 4 4-4" stroke="#6B6B7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FlagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" stroke="#7B8CDE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
