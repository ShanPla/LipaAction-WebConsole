"use client";

import { Icon } from "@/components/ui/Icon";
import type { Translate } from "@/lib/i18n";
import type { AgencyLabel } from "./useAgencyDirectory";

/**
 * An agency's name and the letters on its avatar, or a generic label while
 * the agency list hasn't loaded (or doesn't know the id). An agency message
 * is never hidden for want of a name.
 */
export function agencyLabelOf(
  agencies: Map<string, AgencyLabel> | undefined,
  agencyId: string | null,
  t: Translate
): AgencyLabel {
  const known = agencyId ? agencies?.get(agencyId) : undefined;
  if (known && known.name) return known;
  return { name: t("chat.v2.agencyFallback"), initials: known?.initials ?? "?" };
}

/**
 * The small round marker for a chat participant (REPORT_CHAT_V2), one
 * colour per side: the reporter as an icon on grey (never initials, as
 * ReporterChip explains), an agency as its code on dark ink. The desk is
 * the viewer and is not drawn. Decorative: the text next to it, or its
 * screen-reader line, names the participant.
 */
export function ChatAvatar({
  side,
  agencyId,
  agencies,
}: {
  side: "resident" | "agency";
  agencyId: string | null;
  agencies?: Map<string, AgencyLabel>;
}) {
  if (side === "resident") {
    return (
      <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-700">
        <Icon name="person" className="h-3 w-3" />
      </span>
    );
  }
  const initials = (agencyId ? agencies?.get(agencyId)?.initials : undefined) ?? "?";
  return (
    <span
      aria-hidden
      className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-ink-700 px-1 text-[9px] font-semibold leading-none text-white"
    >
      {initials}
    </span>
  );
}
