/**
 * The pieces every püpi screen is built out of.
 *
 * Presentational only — they take contract types and render them. None of them
 * fetch, and none of them decide what a user may see; that arrives already
 * filtered from `../api`.
 */

import type { ReactNode } from "react";
import type { Bathroom, UserSummary, WashroomType } from "../../shared/api";
import { buildingColor, gradient, initials, locationOf, palette, scoreColor, washroomMeta } from "../lib/display";
import { BackIcon, BookmarkIcon, FriendsIcon, HomeIcon, PlusIcon, ProfileIcon, SearchIcon, TrophyIcon } from "./icons";

// ─── Badges ───────────────────────────────────────────────────────────────────

/**
 * Which washroom this is. Deliberately impossible to miss: it's what makes the
 * friends feed legible when it shows you a type you don't use.
 */
export function WashroomBadge({ type, size = "sm" }: { type: WashroomType; size?: "sm" | "md" }) {
  const meta = washroomMeta[type];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full"
      style={{
        color: meta.color,
        background: meta.bg,
        fontSize: size === "md" ? 12 : 11,
        fontWeight: 600,
        padding: size === "md" ? "3px 9px" : "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: size === "md" ? 11 : 10 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export function ScoreChip({ score, label = "Not rated" }: { score: number | null; label?: string }) {
  if (score === null) {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-1"
        style={{ color: palette.faint, background: "#F5F4F0", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}
      >
        {label}
      </span>
    );
  }
  const color = scoreColor(score);
  return (
    <span
      className="inline-flex items-center rounded-full tabular-nums"
      style={{ color, background: `${color}1A`, fontSize: 13, fontWeight: 700, padding: "4px 10px" }}
    >
      {score.toFixed(1)}
    </span>
  );
}

export function BuildingChip({ bathroom, size = 44 }: { bathroom: Bathroom; size?: number }) {
  const color = buildingColor(bathroom.building);
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-xl"
      style={{
        width: size,
        height: size,
        background: `${color}20`,
        color,
        fontSize: size > 38 ? 13 : 11,
        fontWeight: 800,
      }}
    >
      {bathroom.building}
    </div>
  );
}

export function Avatar({ user, size = 36 }: { user: Pick<UserSummary, "display_name" | "avatar_color">; size?: number }) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `${user.avatar_color}22`,
        color: user.avatar_color,
        fontSize: size > 40 ? 16 : 13,
        fontWeight: 700,
      }}
    >
      {initials(user.display_name)}
    </div>
  );
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

export function BathroomRow({
  bathroom,
  onPress,
  selected,
  score,
  bookmarked,
  trailing,
}: {
  bathroom: Bathroom;
  onPress: () => void;
  selected?: boolean;
  /** Your personal score when you have one; falls back to the global score. */
  score?: number | null;
  bookmarked?: boolean;
  trailing?: ReactNode;
}) {
  const shown = score === undefined ? bathroom.global_score : score;
  return (
    <button
      onClick={onPress}
      className="flex w-full items-center gap-3 px-4 py-3.5 transition-all active:scale-[0.98]"
      style={{
        background: selected ? palette.periwinkleLight : "white",
        borderRadius: 16,
        textAlign: "left",
        border: selected ? `2px solid ${palette.periwinkle}` : "2px solid transparent",
        boxShadow: selected ? "0 4px 16px #7B8CDE22" : "0 1px 4px #0000000A",
      }}
    >
      <BuildingChip bathroom={bathroom} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 truncate text-sm" style={{ color: palette.charcoal, fontWeight: 600 }}>
          {locationOf(bathroom)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: palette.muted }}>
            Floor {bathroom.floor}
          </span>
          <WashroomBadge type={bathroom.washroom_type} />
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
        {trailing ?? <ScoreChip score={shown} />}
        {bookmarked && <span style={{ fontSize: 13 }}>🔖</span>}
      </div>
    </button>
  );
}

// ─── Layout bits ──────────────────────────────────────────────────────────────

export function RoundButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center active:opacity-70"
      style={{ width: 38, height: 38, borderRadius: 12, background: "white", border: `1.5px solid ${palette.border}` }}
    >
      {children}
    </button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <RoundButton onClick={onClick}>
      <BackIcon />
    </RoundButton>
  );
}

export function BookmarkButton({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={disabled ? "You can only save washrooms you use" : on ? "Saved" : "Save"}
      className="flex items-center justify-center active:opacity-70"
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        background: "white",
        opacity: disabled ? 0.4 : 1,
        border: `1.5px solid ${palette.border}`,
      }}
    >
      <BookmarkIcon filled={on} />
    </button>
  );
}

export function PrimaryButton({
  onClick,
  disabled,
  children,
  tone = "primary",
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  tone?: "primary" | "dark";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 transition-all active:opacity-80"
      style={{
        borderRadius: 16,
        fontSize: 16,
        fontWeight: 700,
        background: disabled ? palette.border : tone === "dark" ? gradient.dark : gradient.primary,
        color: disabled ? palette.faint : "white",
        boxShadow: disabled ? "none" : tone === "dark" ? "0 4px 16px #1C1C2E33" : "0 4px 20px #7B8CDE44",
      }}
    >
      {children}
    </button>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-3"
      style={{ background: "white", borderRadius: 14, border: `1.5px solid ${palette.border}` }}
    >
      <SearchIcon />
      <input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none"
        style={{ fontSize: 15, color: palette.charcoal, fontFamily: "inherit" }}
      />
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  activeColor = palette.periwinkle,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 rounded-full px-4 py-1.5 transition-all"
      style={{
        fontSize: 13,
        fontWeight: 600,
        background: active ? activeColor : "white",
        color: active ? "white" : palette.muted,
        border: active ? "none" : `1.5px solid ${palette.border}`,
      }}
    >
      {children}
    </button>
  );
}

/** Two-up segmented control, used for the list and profile tabs. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex gap-1 p-1" style={{ background: "#EFEDE7", borderRadius: 14 }}>
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className="flex-1 py-2 transition-all"
          style={{
            borderRadius: 11,
            fontSize: 13,
            fontWeight: 700,
            background: value === option.id ? "white" : "transparent",
            color: value === option.id ? palette.charcoal : palette.muted,
            boxShadow: value === option.id ? "0 1px 4px #00000012" : "none",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-14 text-center">
      <div
        className="mb-4 flex items-center justify-center"
        style={{ width: 72, height: 72, borderRadius: 24, background: palette.periwinkleLight, fontSize: 30 }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: palette.charcoal }}>{title}</div>
      <p style={{ fontSize: 13, color: palette.muted, marginTop: 6, lineHeight: 1.5, maxWidth: 260 }}>{body}</p>
      {action && <div className="mt-5 w-full">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  const color = tone === "error" ? "#D2544F" : palette.muted;
  return (
    <div
      className="px-4 py-3"
      style={{
        borderRadius: 14,
        background: tone === "error" ? "#FDECEB" : "white",
        color,
        fontSize: 13,
        fontWeight: 500,
        border: `1px solid ${tone === "error" ? "#F6D4D2" : palette.border}`,
      }}
    >
      {children}
    </div>
  );
}

export function Spinner({ size = 18, color = palette.periwinkle }: { size?: number; color?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        borderTopColor: "transparent",
        animation: "pupi-spin 0.6s linear infinite",
      }}
    />
  );
}

export function LoadingScreen() {
  return (
    <div className="flex h-full items-center justify-center" style={{ background: palette.bg }}>
      <Spinner size={26} />
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

export type Tab = "home" | "rankings" | "friends" | "profile";

export function TabBar({ active, onSelect, onRate }: { active: Tab; onSelect: (tab: Tab) => void; onRate: () => void }) {
  const tabs: { id: Tab; Icon: (props: { active?: boolean }) => ReactNode; label: string }[] = [
    { id: "home", Icon: HomeIcon, label: "Home" },
    { id: "rankings", Icon: TrophyIcon, label: "Rankings" },
    { id: "friends", Icon: FriendsIcon, label: "Friends" },
    { id: "profile", Icon: ProfileIcon, label: "Profile" },
  ];

  return (
    <div
      className="flex flex-shrink-0 items-end justify-around px-2 pb-6 pt-2"
      style={{ background: "white", borderTop: `1px solid ${palette.border}` }}
    >
      {tabs.slice(0, 2).map(tab => (
        <TabButton key={tab.id} tab={tab} active={active === tab.id} onSelect={onSelect} />
      ))}

      {/* The rate button isn't a tab — it opens the review flow, which has no tab bar. */}
      <button className="-mt-7 flex flex-col items-center" onClick={onRate}>
        <div
          className="flex items-center justify-center shadow-lg"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: gradient.brand,
            boxShadow: "0 4px 20px #7B8CDE44",
          }}
        >
          <PlusIcon />
        </div>
        <span style={{ color: palette.periwinkle, fontSize: 10, fontWeight: 600, marginTop: 4 }}>Rate</span>
      </button>

      {tabs.slice(2).map(tab => (
        <TabButton key={tab.id} tab={tab} active={active === tab.id} onSelect={onSelect} />
      ))}
    </div>
  );
}

function TabButton({
  tab,
  active,
  onSelect,
}: {
  tab: { id: Tab; Icon: (props: { active?: boolean }) => ReactNode; label: string };
  active: boolean;
  onSelect: (tab: Tab) => void;
}) {
  const { Icon } = tab;
  return (
    <button className="flex flex-col items-center gap-1 px-2 py-1" onClick={() => onSelect(tab.id)}>
      <Icon active={active} />
      <span style={{ color: active ? palette.periwinkle : palette.faint, fontSize: 10, fontWeight: active ? 600 : 400 }}>
        {tab.label}
      </span>
    </button>
  );
}
