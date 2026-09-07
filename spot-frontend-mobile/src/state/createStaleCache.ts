import { create } from 'zustand';

/**
 * Generic stale-while-revalidate cache store, one instance per bottom-nav
 * tab's data (see specs/002-tab-navigation-performance/data-model.md's
 * "Data Fetch Cache" entity). Pure state — no fetch/network logic lives
 * here; screens own their own axios calls and report results in via
 * `applyResult`/`applyError`.
 */
export type StaleCacheState<T> = {
  data: T | null;
  lastFetchedAt: number | null;
  isRefreshing: boolean;
  error: string | null;
  /** Marks a background/foreground fetch as in flight. */
  setRefreshing: (refreshing: boolean) => void;
  /** A fetch succeeded — replaces `data`, stamps `lastFetchedAt`, clears `error`. */
  applyResult: (data: T) => void;
  /**
   * A fetch failed — records `error` but deliberately leaves `data`
   * untouched (data-model.md rule 3: a background-refresh failure must not
   * blank out the last-known-good list the user is already looking at).
   */
  applyError: (message: string) => void;
  /** True when `lastFetchedAt` is older than `ttlMs`, or there is no data yet. */
  isStale: (ttlMs: number) => boolean;
};

export function createStaleCache<T>() {
  return create<StaleCacheState<T>>((set, get) => ({
    data: null,
    lastFetchedAt: null,
    isRefreshing: false,
    error: null,
    setRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
    applyResult: (data) =>
      set({ data, lastFetchedAt: Date.now(), error: null, isRefreshing: false }),
    applyError: (message) => set({ error: message, isRefreshing: false }),
    isStale: (ttlMs) => {
      const { lastFetchedAt } = get();
      if (lastFetchedAt == null) return true;
      return Date.now() - lastFetchedAt > ttlMs;
    },
  }));
}
