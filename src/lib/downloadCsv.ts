import { csvCell } from "@/lib/utils";

/**
 * Hands the browser a CSV file built from `rows` (the first row is usually the
 * header). Shared by every export so each gets the same three protections:
 *
 * - csvCell on every cell: formula-neutralised, then quoted. Several columns
 *   hold text other people typed, which a spreadsheet would otherwise run.
 * - A UTF-8 byte-order mark and CRLF line endings, so Excel opens the file as
 *   UTF-8 — without the mark, a reason typed in Filipino renders as mojibake.
 * - The object URL is revoked on the next tick, not immediately: some
 *   browsers start the download after click() returns, and revoking first
 *   cancels it.
 *
 * Browser-only: call it from an event handler in a client component.
 */
export function downloadCsv(filename: string, rows: readonly (readonly unknown[])[]): void {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
