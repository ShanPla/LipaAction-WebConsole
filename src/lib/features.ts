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

/**
 * Whether the backend lets a barangay desk close an Other-report itself,
 * without sending it to an agency (resolve_report_at_barangay). The function
 * was asked of the backend owner on 2026-10-05 and doesn't exist yet, so the
 * [Resolve at barangay] button stays hidden and the action refuses: a button
 * that can only fail is worse than none. Set this to true on the day the
 * backend owner confirms the function is live, after checking its name,
 * arguments and error codes against resolveAtBarangay in
 * src/app/actions/reports.ts.
 */
export const BARANGAY_RESOLVE_LIVE: boolean = false;
