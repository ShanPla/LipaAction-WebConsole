/**
 * How a write through one of the backend's admin functions ended. A code,
 * not a sentence: the page words it in the official's language, and no
 * table, column or policy name reaches the browser.
 *
 * `stale` is the backend's 55000: the row on screen is behind the database
 * (someone else acted first, or a double click). It is never worded as an
 * error, and the action has refreshed the page by the time it is read.
 */
export type WriteOutcome =
  | "done"
  | "stale"
  | "invalid"
  | "refused"
  | "not-eligible"
  | "session-expired"
  | "unreachable"
  | "failed";

/**
 * What a refused or failed function call means, from its code and HTTP
 * status alone. The first two readings are the ones reports.ts makes: no
 * HTTP answer is a network failure, and a 401 (or a PGRST30x) means no
 * usable session reached PostgREST, which is not a refusal of this official.
 *
 * `on22023` is what a 22023 means for the calling action, once it has proven
 * its own input: the functions use that one code for a bad argument and for
 * a target that isn't eligible.
 */
export function failedWriteOutcome(
  name: string,
  subjectId: string,
  status: number,
  error: { code?: string; message?: string },
  on22023: WriteOutcome
): WriteOutcome {
  let outcome: WriteOutcome;
  if (status === 0) outcome = "unreachable";
  else if (status === 401 || (error.code ?? "").startsWith("PGRST30")) outcome = "session-expired";
  // 55000: the row on screen is behind the database. Also what a double
  // click gets, so it is never worded as an error.
  else if (error.code === "55000") outcome = "stale";
  // 42501 is one answer for [your role can't] and [not in your barangay], on
  // purpose: it can't be used to learn that another barangay's resident exists.
  else if (error.code === "42501") outcome = "refused";
  else if (error.code === "22023") outcome = on22023;
  else outcome = "failed";

  if (outcome === "failed" || outcome === "refused") {
    // Codes and ids only. A failed call's message is kept for the unexpected
    // case alone, where it is the only clue.
    console.error(
      `[${name}] not done`,
      JSON.stringify({
        outcome,
        subject: subjectId,
        status,
        code: error.code,
        ...(outcome === "failed" ? { message: error.message } : {}),
      })
    );
  }
  return outcome;
}
