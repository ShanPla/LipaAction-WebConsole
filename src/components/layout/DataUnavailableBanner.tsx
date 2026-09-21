import { useT } from "@/lib/i18n";

/**
 * Shown when a page's data query failed.
 *
 * Every data module fails closed — a bad column name, an RLS change, or a
 * Supabase outage all come back as an empty result rather than a throw. That
 * is right for stability and wrong for an emergency console: [No reports in
 * this queue right now] is the calmest sentence on the site, and it used to
 * be what an outage looked like. This banner is the difference between
 * "nothing happened" and "we can't tell you what happened".
 *
 * Carries no error text on purpose, for the same reason ErrorState doesn't:
 * the message can name tables, columns, or policies. The server log has it.
 *
 * `what` arrives already translated — it is spliced into the title.
 */
export function DataUnavailableBanner({ what }: { what: string }) {
  const t = useT();
  return (
    <div
      role="alert"
      className="mb-4 rounded-card border border-priority-critical/40 bg-priority-criticalBg px-4 py-3 text-xs text-ink-700"
    >
      <span className="font-semibold text-priority-critical">{t("banner.title", { what })}</span>{" "}
      {t("banner.body")}
    </div>
  );
}
