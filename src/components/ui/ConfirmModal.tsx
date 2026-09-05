"use client";

import { Button } from "./Button";

/**
 * Plain yes/no confirmation. ReasonPromptModal covers the case where a reason
 * is mandatory (rejection); this one is for an action that needs a deliberate
 * second step but no free text — notably validating a whole cluster at once,
 * where the click commits several reports rather than one.
 */
export function ConfirmModal({
  title,
  description,
  confirmLabel,
  variant = "primary",
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "primary" | "danger";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Cancel"
        className="absolute inset-0 bg-ink-900/40"
        onClick={onCancel}
        disabled={busy}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-sm rounded-card border border-ink-100 bg-white p-5 shadow-panel"
      >
        <p id="confirm-modal-title" className="mb-1 text-sm font-semibold text-ink-900">
          {title}
        </p>
        <p className="mb-4 text-xs text-ink-500">{description}</p>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={variant} size="sm" disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
