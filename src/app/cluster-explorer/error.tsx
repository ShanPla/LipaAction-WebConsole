"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState pageName="Cluster Explorer" error={error} reset={reset} />;
}
