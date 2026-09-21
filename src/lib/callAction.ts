/**
 * Calls a Server Action and turns [no answer] into null instead of a throw.
 *
 * A Server Action is a POST. If it never answers — the network dropped, the
 * function timed out, the host returned an error page instead of an RSC
 * response — the awaited promise rejects. Inside startTransition that
 * rejection is re-thrown during render, and the route's error.tsx replaced
 * the whole queue with a page saying nothing had changed. That was false:
 * the write may well have landed before the connection failed.
 *
 * So a missing answer is reported as exactly that — see NO_ANSWER — and
 * never as success or failure. Deliberately no router.refresh() here: right
 * after a failed POST the next request may fail the same way, and on Next 14
 * a failed refresh becomes a hard navigation. The queue's live channel, and
 * its poll fallback, bring the true state back.
 */
export async function callAction<T>(action: () => Promise<T>): Promise<T | null> {
  try {
    const result = await action();
    return result ?? null;
  } catch (error) {
    console.error("[action] no answer", error);
    return null;
  }
}

export const NO_ANSWER =
  "Couldn't confirm that went through. Check the queue before trying again.";
