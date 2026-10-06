"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { useT, type Translate } from "@/lib/i18n";
import type { ClusterExplorerEntry, ClusterMemberDetail } from "@/types";

// Dot colour by tier, from the priority tokens; an unscored report is neutral.
const DOT_CLASS: Record<string, string> = {
  Critical: "fill-priority-critical stroke-priority-critical",
  High: "fill-priority-high stroke-priority-high",
  Medium: "fill-priority-medium stroke-priority-medium",
  Low: "fill-priority-low stroke-priority-low",
};
const UNSCORED_DOT = "fill-ink-500 stroke-ink-500";

/**
 * Each member's real position — the same geom the queue drawer plots,
 * loaded under the same privacy rule (see loadPositions): never for an
 * identity-withheld or discreet report, and a member with no usable
 * position just isn't a dot, counted apart below the map instead of guessed
 * at. There is still no real centroid or radius to draw, so the map fits
 * itself to whichever points it has rather than claiming a shape for the
 * cluster.
 *
 * No access-log entry of its own: a dot's label carries only the report id,
 * category and priority — nothing the resident wrote — the same reasoning
 * the city map uses for why its dots need none either. The reporter's own
 * words stay behind the queue drawer, which does log its opening.
 */
export function MapPanel({ cluster }: { cluster: ClusterExplorerEntry }) {
  const t = useT();
  const points = useMemo(
    () => cluster.members.filter((m): m is ClusterMemberDetail & { position: { kind: "point"; lat: number; lng: number } } => m.position.kind === "point"),
    [cluster.members]
  );
  const hiddenCount = cluster.members.filter((m) => m.position.kind === "hidden").length;
  const missingCount = cluster.members.filter(
    (m) => m.position.kind === "none" || m.position.kind === "unavailable"
  ).length;

  return (
    <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel lg:w-72">
      <div className="border-b border-ink-100 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{t("cluster.map.title")}</p>
        <p className="text-xs text-ink-500">
          {t("cluster.map.shown", { shown: points.length, total: cluster.members.length })}
        </p>
      </div>

      <div className="relative min-h-[220px] flex-1 bg-ink-50">
        {points.length > 0 ? <PointsMap points={points} /> : <NoPoints />}
      </div>

      <div className="border-t border-ink-100 px-3 py-2.5 text-[11px] text-ink-500">
        <p>{t("cluster.map.area", { name: cluster.centroidLabel })}</p>
        {hiddenCount > 0 && <p className="mt-1">{t("cluster.map.hiddenNote", { count: hiddenCount })}</p>}
        {missingCount > 0 && <p className="mt-1">{t("cluster.map.missingNote", { count: missingCount })}</p>}
      </div>
    </div>
  );
}

function NoPoints() {
  const t = useT();
  return (
    <div className="flex h-full items-center justify-center px-4 text-center">
      <p className="text-xs text-ink-500">{t("cluster.map.noneUsable")}</p>
    </div>
  );
}

/**
 * Leaflet, loaded only in the browser: it touches window when it loads, so a
 * static import would fail the server render. Fits itself to whichever
 * points this cluster has, the same way the city map does.
 */
function PointsMap({
  points,
}: {
  points: (ClusterMemberDetail & { position: { kind: "point"; lat: number; lng: number } })[];
}) {
  const t = useT();
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let map: LeafletMap | null = null;
    let cancelled = false;
    setState("loading");

    import("leaflet")
      .then((mod) => {
        // Leaflet is a CommonJS module, so the bundler hands it over as a
        // default export; the fallback covers a build that doesn't.
        const L = (mod as unknown as { default?: typeof mod }).default ?? mod;
        if (cancelled || !container.current) return;
        map = L.map(container.current, {
          center: [points[0].position.lat, points[0].position.lng],
          zoom: 16,
          // A wheel over the map would zoom it instead of scrolling the page.
          scrollWheelZoom: false,
        });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        for (const m of points) {
          L.circleMarker([m.position.lat, m.position.lng], {
            radius: 8,
            weight: 2,
            fillOpacity: 0.7,
            // Full class names, so Tailwind finds them here; a CSS fill
            // outranks the colour Leaflet writes as an attribute.
            className: (m.priority && DOT_CLASS[m.priority]) || UNSCORED_DOT,
          })
            // An element, not an HTML string: Leaflet would parse a string
            // as markup, and this label carries a database value.
            .bindTooltip(dotLabel(m, t))
            .addTo(map);
        }

        if (points.length > 1) {
          map.fitBounds(
            points.map((m) => [m.position.lat, m.position.lng] as [number, number]),
            { padding: [24, 24], maxZoom: 18 }
          );
        }
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("failed");
      });

    return () => {
      cancelled = true;
      map?.remove();
    };
    // points is memoized on cluster.members (see the parent), so this only
    // re-runs when the selected cluster actually changes.
  }, [points, t]);

  return (
    // isolate: Leaflet stacks its panes at z-index 400 and up, which would
    // otherwise draw them over the account menu and any dialog on the page.
    <div className="relative isolate h-full overflow-hidden">
      <div ref={container} role="region" aria-label={t("cluster.map.aria")} className="h-full w-full" />
      {state !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 px-4 text-center">
          <p role="status" className="text-xs text-ink-700">
            {t(state === "failed" ? "cluster.map.failed" : "cluster.map.loading")}
          </p>
        </div>
      )}
    </div>
  );
}

// [018e5736… · Fire · Critical 97.2 · Primary]
function dotLabel(m: ClusterMemberDetail, t: Translate): HTMLElement {
  const box = document.createElement("div");
  box.textContent = [
    m.reportId,
    m.category,
    priorityText(m, t),
    m.relationship === "Primary" ? t("cluster.member.primary") : t("cluster.member.related"),
  ].join(" · ");
  return box;
}

function priorityText(m: ClusterMemberDetail, t: Translate): string {
  if (m.priority === null) return t("priority.unscored");
  return m.priority;
}
