/**
 * Backend features the console cannot detect on its own, switched here by
 * hand on the day the backend owner confirms they are live in production.
 */

/**
 * Whether the backend writes duplicate clusters back onto reports (its Step
 * 24). Until it does, the Flagged duplicates tab and Cluster Explorer stay
 * empty whatever is filed, and their empty states say grouping isn't
 * connected. An empty list looks the same either way, so nothing on the page
 * can tell which case it is in: when write-back is live, set this to true and
 * the empty states switch to copy that describes the grouping instead.
 *
 * On since 2026-10-01, when the backend owner confirmed write-back is live
 * and the first real clusters appeared in Inosluban.
 */
export const DUPLICATE_WRITEBACK_LIVE: boolean = true;
