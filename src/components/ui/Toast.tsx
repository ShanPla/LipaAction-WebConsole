"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { cx } from "@/lib/utils";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "info" | "danger";
}

interface ToastContextValue {
  showToast: (message: string, tone?: Toast["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

// Long enough to read; a failure gets longer because it usually needs acting
// on. Both are pausable and dismissable (WCAG 2.2.1), which the previous
// fixed 3-second timeout was not.
const DURATION_MS: Record<Toast["tone"], number> = {
  success: 4000,
  info: 4000,
  danger: 7000,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    setToasts((prev) => [...prev, { id: nextId++, message, tone }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  // Hovering or focusing holds the toast; leaving restarts the full timer.
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => dismiss(toast.id), DURATION_MS[toast.tone]);
    return () => clearTimeout(timer);
  }, [paused, dismiss, toast.id, toast.tone]);

  return (
    <div
      // A failure interrupts; a success waits its turn. role="alert" is
      // implicitly aria-live="assertive", role="status" implicitly polite.
      role={toast.tone === "danger" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cx(
        "pointer-events-auto flex items-start gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium shadow-lg",
        toast.tone === "success" && "bg-brand-600 text-white",
        toast.tone === "info" && "bg-ink-900 text-white",
        toast.tone === "danger" && "bg-priority-critical text-white"
      )}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismiss(toast.id)}
        className="-mr-1 -mt-0.5 rounded px-1 text-base leading-none opacity-80 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
