"use client";

import { useEffect, useRef } from "react";

/**
 * Closes a dialog when Escape is pressed.
 *
 * Every overlay in the console — the report detail drawer, the reject-reason
 * prompt, the cluster confirmation, the display-name prompt — could only be
 * dismissed by clicking. Escape is what people reach for, and a keyboard user
 * who tabs into a dialog had no way out without hunting for Cancel.
 *
 * `enabled` exists for two cases, and both matter:
 *
 * - A write is in flight. Escape must not close a dialog mid-request, for the
 *   same reason its Cancel button is disabled then — the action still lands,
 *   but the official is no longer looking at what it applied to.
 * - Two overlays are stacked. The reject prompt opens on top of the detail
 *   drawer, and both would otherwise receive the same keypress and close
 *   together. The drawer disables its own handler while the prompt is up, so
 *   Escape backs out one layer at a time.
 */
export function useDismissOnEscape(onDismiss: () => void, enabled = true) {
  // Held in a ref so an inline arrow prop doesn't resubscribe the listener on
  // every render.
  const handler = useRef(onDismiss);

  useEffect(() => {
    handler.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handler.current();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
