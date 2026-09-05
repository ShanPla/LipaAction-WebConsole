"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState pageName="Audit Log" error={error} reset={reset} />;
}
