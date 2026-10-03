"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useRecordedExport } from "@/components/ui/useRecordedExport";
import { useT } from "@/lib/i18n";
import type { ExportKind } from "@/lib/exports";

/**
 * Prints one report section, which the browser's print dialog can also save
 * as a PDF: the thesis asks for PDF exports, and the browser already makes
 * them, so no PDF library is bundled.
 *
 * Every printable section carries data-printable="<its id>". While the dialog
 * is open the others carry data-print-hide, which globals.css hides in print;
 * the shell's sidebar, top bar and toasts are print:hidden. Screen layout is
 * untouched.
 *
 * `record` is for a section that names people or shows the trail itself: the
 * print is then written to the access trail first, and happens only if that
 * succeeded (see useRecordedExport). A section of counts alone passes none,
 * and prints inside the click as before.
 */
export function PrintButton({
  section,
  record,
}: {
  section: string;
  record?: { what: ExportKind; rows: number };
}) {
  const t = useT();
  const { showToast } = useToast();
  const { record: recordExport, busy } = useRecordedExport();
  // What this button would print now, read again once a record comes back.
  const current = useRef(record);
  current.current = record;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function print() {
    // Marks left by a print call the browser ignored (no afterprint follows
    // one) would blank the next print of another section.
    document.querySelectorAll("[data-print-hide]").forEach((el) => el.removeAttribute("data-print-hide"));
    const others = [...document.querySelectorAll<HTMLElement>("[data-printable]")].filter(
      (el) => el.dataset.printable !== section
    );
    others.forEach((el) => el.setAttribute("data-print-hide", ""));
    const restore = () => {
      others.forEach((el) => el.removeAttribute("data-print-hide"));
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  async function handleClick() {
    if (record) {
      // Nothing on screen to print: no record of an export that isn't one.
      if (record.rows === 0) {
        showToast(t("print.nothing"), "info");
        return;
      }
      if (!(await recordExport(record.what, record.rows, "print"))) return;
      // The record took a round trip. If the page moved on meanwhile, to
      // another page or to other rows under a changed filter, what would
      // print is no longer what was recorded, so nothing is printed.
      if (!mounted.current || current.current?.rows !== record.rows) {
        showToast(t("print.changed"), "danger");
        return;
      }
    }
    print();
  }

  return (
    <Button variant="secondary" size="sm" disabled={busy} onClick={handleClick}>
      {busy ? t("common.working") : t("print.button")}
    </Button>
  );
}
