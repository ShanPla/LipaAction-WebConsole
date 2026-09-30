import "server-only";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/utils";

export interface AgencyCategory {
  category: string; // display label
  isPrimary: boolean;
}

export interface CityAgency {
  id: string;
  name: string | null;
  code: string | null;
  tier: string | null;
  // null when the routing rules couldn't be read, which is not the same as
  // [no category routes here].
  categories: AgencyCategory[] | null;
}

export interface CityAgenciesData {
  agencies: CityAgency[];
  loadFailed: boolean;
}

/**
 * The paper's Agencies page (A.5.4), read-only: every agency in the system
 * and the categories category_agency_routing sends to it, the same table
 * routeReport reads when a barangay routes a report. The paper's write side
 * (adding agencies, elevating one, editing a dispatch address) isn't built;
 * the page says so.
 *
 * Tier is shown as the database holds it. The paper's tiers are A, B and C,
 * but the console doesn't assume the stored values match.
 */
export async function getCityAgencies(): Promise<CityAgenciesData> {
  const supabase = createClient();
  const [agenciesRes, mappingRes] = await Promise.all([
    supabase.from("agencies").select("id, code, name, tier").limit(500),
    supabase.from("category_agency_routing").select("category_key, agency_id, is_primary, sort_order").limit(2000),
  ]);

  if (agenciesRes.error || !agenciesRes.data) {
    console.error("[city-agencies] load failed", agenciesRes.error?.code, agenciesRes.error?.message);
    return { agencies: [], loadFailed: true };
  }
  if (mappingRes.error) {
    console.error("[city-agencies] routing rules failed", mappingRes.error.code, mappingRes.error.message);
  }

  const byAgency = new Map<string, AgencyCategory[]>();
  const mapping = (mappingRes.data ?? []) as {
    category_key: string;
    agency_id: string;
    is_primary: boolean;
    sort_order: number | null;
  }[];
  for (const m of mapping) {
    const list = byAgency.get(m.agency_id) ?? [];
    list.push({ category: categoryLabel(m.category_key), isPrimary: m.is_primary });
    byAgency.set(m.agency_id, list);
  }
  // Categories it leads first, then alphabetical.
  for (const list of byAgency.values()) {
    list.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.category.localeCompare(b.category));
  }

  const agencies = (agenciesRes.data as { id: string; code: string | null; name: string | null; tier: string | null }[])
    .map(
      (a): CityAgency => ({
        id: a.id,
        name: a.name?.trim() || null,
        code: a.code?.trim() || null,
        tier: a.tier === null || a.tier === undefined ? null : String(a.tier),
        categories: mappingRes.error ? null : byAgency.get(a.id) ?? [],
      })
    )
    // Agencies that receive reports first; then by name.
    .sort(
      (a, b) =>
        (b.categories?.length ?? 0) - (a.categories?.length ?? 0) ||
        (a.name ?? "￿").localeCompare(b.name ?? "￿")
    );

  return { agencies, loadFailed: false };
}
