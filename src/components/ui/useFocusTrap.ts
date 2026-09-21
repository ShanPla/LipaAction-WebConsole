"use client";

import { useEffect, useRef, useState } from "react";

const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

function tabbablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => !el.matches(":disabled") && !el.hasAttribute("hidden") && el.tabIndex >= 0
  );
}

/**
 * Keeps keyboard focus inside a dialog while it is open, and puts it back
 * where it came from when the dialog closes.
 *
 * Every overlay here is `aria-modal`, which is a promise to assistive tech
 * that nothing outside the dialog is reachable — but the browser doesn't
 * enforce that. Without this, Tab walked straight out of an open drawer into
 * the queue behind it, and a keyboard user could act on a row they could not
 * see. Escape (useDismissOnEscape) is the way out; Tab is not.
 *
 * Attach the returned ref to the `role="dialog"` element and give it
 * `tabIndex={-1}`, so it can take focus itself when nothing inside carries
 * `autoFocus` — a screen reader then announces the dialog's title before the
 * first control, instead of landing on a Close button with no context.
 *
 * `active` mirrors useDismissOnEscape's `enabled` for the stacked case: the
 * detail drawer passes `!isRejecting`, so only the topmost dialog handles
 * Tab. Deactivating does *not* return focus — that happens only on unmount,
 * so a drawer that briefly yields to the reject prompt keeps its place.
 */
export function useFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null);

  // Return focus on unmount only. Captured during the FIRST RENDER, not in an
  // effect: React applies autoFocus during commit, before effects run, so an
  // effect saw the dialog's own input as [the opener] and returned focus to
  // a node that was about to disappear — dropping keyboard users back at the
  // top of the page. Skipped if the opener has since left the DOM (a resolved
  // row re-rendered, or a stacked prompt unmounting with its parent drawer).
  const [opener] = useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)
  );
  useEffect(() => {
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [opener]);

  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;

    // React's autoFocus has already run by now; only claim focus if nothing
    // inside has it.
    if (!root.contains(document.activeElement)) root.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !root) return;

      const list = tabbablesIn(root);
      if (list.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }

      const current = document.activeElement as HTMLElement | null;
      const index = current ? list.indexOf(current) : -1;
      const first = list[0];
      const last = list[list.length - 1];

      // index === -1 covers focus sitting on the root itself (or, defensively,
      // somewhere outside): either direction wraps to the boundary.
      if (event.shiftKey) {
        if (index <= 0) {
          event.preventDefault();
          last.focus();
        }
      } else if (index === -1 || index === list.length - 1) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active]);

  return ref;
}
