"use client";

import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";

/**
 * Prints one report section, which the browser's print dialog can also save
 * as a PDF: the thesis asks for PDF exports, and the browser already makes
 * them, so no PDF library is bundled.
 *
 * Every printable section carries data-printable="<its id>". While the dialog
 * is open the others carry data-print-hide, which globals.css hides in print;
 * the shell's sidebar, top bar and toasts are print:hidden. Screen layout is
 * untouched.
 */
export function PrintButton({ section }: { section: string }) {
  const t = useT();

  function print() {
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

  return (
    <Button variant="secondary" size="sm" onClick={print}>
      {t("print.button")}
    </Button>
  );
}
