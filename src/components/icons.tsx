/**
 * One icon.
 *
 * The screens used to carry a drawn icon for every action — tab glyphs, a
 * magnifier, chevrons, a bookmark, a flag. They were decoration competing with
 * the one thing on screen worth looking at, so they're gone; buttons say what
 * they do in words instead.
 *
 * The star survives because it isn't decoration. It's the rating control, and a
 * row of five taps is the input itself.
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
