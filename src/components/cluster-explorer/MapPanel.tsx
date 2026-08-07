import type { ClusterExplorerEntry } from "@/types";

export function MapPanel({ cluster }: { cluster: ClusterExplorerEntry }) {
  const memberCount = cluster.members.length;

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel">
      <div className="border-b border-ink-100 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Spatial extent
        </p>
        <p className="text-xs text-ink-500">{cluster.radiusMeters}m radius around centroid</p>
      </div>

      <div className="relative flex-1 bg-ink-50">
        <svg viewBox="0 0 240 240" className="h-full w-full" role="img" aria-label="Cluster spatial map">
          <rect width="240" height="240" fill="#eef1ed" />
          {/* road-like guide lines to suggest a map without claiming real geodata */}
          <line x1="0" y1="120" x2="240" y2="120" stroke="#d7ddd4" strokeWidth="2" />
          <line x1="120" y1="0" x2="120" y2="240" stroke="#d7ddd4" strokeWidth="2" />
          <circle cx="120" cy="120" r="70" fill="#357a53" fillOpacity="0.12" stroke="#357a53" strokeOpacity="0.4" strokeWidth="1.5" />
          <circle cx="120" cy="120" r="4" fill="#357a53" />
          {cluster.members.map((member, idx) => {
            const angle = (idx / Math.max(memberCount, 1)) * Math.PI * 2;
            const r = 45;
            const x = 120 + r * Math.cos(angle);
            const y = 120 + r * Math.sin(angle);
            const color =
              member.priority === "Critical"
                ? "#c0362c"
                : member.priority === "High"
                ? "#c9722b"
                : "#4d7c8a";
            return (
              <g key={member.reportId}>
                <circle cx={x} cy={y} r="6" fill={color} stroke="white" strokeWidth="1.5" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="border-t border-ink-100 px-3 py-2.5 text-[11px] text-ink-500">
        Centroid: {cluster.centroidLabel}
      </div>
    </div>
  );
}
