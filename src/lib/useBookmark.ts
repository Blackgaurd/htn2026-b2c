/**
 * Toggling a bookmark, for the screens whose rows all carry one.
 *
 * Every bathroom tile has a bookmark control now, so five screens were about to
 * grow the same four lines: call `setBookmark`, reload whatever list the row came
 * from, and keep the refusal where somebody can read it. The gate lives on the
 * other side of `../api` and *rejects* rather than hides, so a failure here is a
 * message to show, not a state to guess at.
 */

import { useCallback, useState } from "react";
import type { Bathroom } from "../../shared/api";
import { setBookmark } from "../api";

export function useBookmark(reload: () => void) {
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(
    async (bathroom: Bathroom) => {
      setError(null);
      try {
        await setBookmark(bathroom.id, !bathroom.bookmarked);
        reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [reload],
  );

  return { toggle, error };
}
