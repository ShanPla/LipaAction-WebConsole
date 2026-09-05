"use client";

/**
 * Last-resort boundary: catches throws in the root layout itself, which the
 * per-route error.tsx files sit inside and therefore cannot catch.
 *
 * It replaces the root layout, so it must render its own <html> and <body>,
 * and it cannot rely on anything that layout provides — no ToastProvider, and
 * no guarantee globals.css is applied. Styles are inline for that reason: a
 * fallback that renders unstyled or invisible is no fallback at all.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f6f8f5",
          fontFamily: "Inter, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "1rem",
        }}
      >
        <div
          style={{
            maxWidth: "26rem",
            width: "100%",
            textAlign: "center",
            backgroundColor: "#ffffff",
            border: "1px solid #e4e8e2",
            borderRadius: "10px",
            padding: "1.5rem",
          }}
        >
          <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", fontWeight: 600, color: "#161c19" }}>
            The console couldn&apos;t start
          </p>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.75rem", color: "#657168" }}>
            Something went wrong before the page could load. Nothing was changed by this error.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: "#357a53",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 0.875rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ margin: "1.25rem 0 0", fontSize: "0.6875rem", color: "#a4ada2" }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
