"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState pageName="City reports" error={error} reset={reset} />;
}
