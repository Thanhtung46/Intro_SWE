import { useRef } from 'react';

type Guard = {
  isCancelled: () => boolean;
  cancel: () => void;
};

/**
 * Standard "ignore stale/abandoned async results" guard (research.md §4).
 * `useCancelledGuard()` returns a `createGuard()` factory — call it once at
 * the top of each `useEffect` whose async result should be discarded once
 * that specific effect run becomes irrelevant (either the component
 * unmounts, or the effect re-runs because a dependency changed before the
 * previous run's fetch resolved). A *new* guard is created on every call,
 * so re-running the effect naturally supersedes the previous run's guard
 * without needing any extra bookkeeping at the call site.
 *
 * Usage:
 *   const createGuard = useCancelledGuard();
 *   useEffect(() => {
 *     const guard = createGuard();
 *     fetchFn().then((result) => {
 *       if (!guard.isCancelled()) applyResult(result);
 *     });
 *     return guard.cancel;
 *   }, [deps]);
 *
 * Does not abort the underlying network request — only discards its result
 * once irrelevant. See research.md §4 for why AbortController is out of
 * scope for this feature.
 */
export function useCancelledGuard(): () => Guard {
  // Stable across renders so `createGuard` itself never needs to be a
  // useEffect dependency.
  const createGuard = useRef((): Guard => {
    let cancelled = false;
    return {
      isCancelled: () => cancelled,
      cancel: () => {
        cancelled = true;
      },
    };
  }).current;

  return createGuard;
}
