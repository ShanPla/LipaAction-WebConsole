"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState pageName="Settings" error={error} reset={reset} />;
}
