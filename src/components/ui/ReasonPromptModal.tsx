"use client";

import { useState } from "react";
import { Button } from "./Button";
import { useDismissOnEscape } from "./useDismissOnEscape";

export function ReasonPromptModal({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useDismissOnEscape(onCancel);
  const trimmed = reason.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Cancel"
        className="absolute inset-0 bg-ink-900/40"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-prompt-title"
        className="relative w-full max-w-sm rounded-card border border-ink-100 bg-white p-5 shadow-panel"
      >
        <p id="reason-prompt-title" className="mb-1 text-sm font-semibold text-ink-900">
          {title}
        </p>
        <p className="mb-3 text-xs text-ink-500">{description}</p>

        <textarea
          autoFocus
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Duplicate of an existing report, resolved on-site, out of scope…"
          className="mb-4 w-full resize-none rounded-md border border-ink-100 bg-ink-50 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none"
        />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={trimmed.length === 0}
            onClick={() => onConfirm(trimmed)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
