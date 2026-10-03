// Reading a report's position, shared by the city map and the queue's
// location preview. Pure, and safe on either side.

/**
 * A point from incident_reports.geom, or null when there is none to show.
 *
 * PostgREST returns PostGIS geometry as EWKB hex: a byte-order byte, a type
 * word whose high bits flag Z, M and an SRID, the SRID if flagged, then x
 * (longitude) and y (latitude) as doubles. Only a 2D or 3D point in WGS 84
 * (SRID 4326, or none) is accepted. A GeoJSON point is read too, in case the
 * API is ever set to return it. Out-of-range values and 0,0 (a phone with no
 * fix) are refused rather than drawn in the ocean.
 */
export function parsePoint(geom: unknown): { lat: number; lng: number } | null {
  let lng: number;
  let lat: number;

  if (geom && typeof geom === "object") {
    const g = geom as { type?: unknown; coordinates?: unknown };
    if (g.type !== "Point" || !Array.isArray(g.coordinates) || g.coordinates.length < 2) return null;
    [lng, lat] = g.coordinates as number[];
  } else if (typeof geom === "string" && /^(?:[0-9a-fA-F]{2})+$/.test(geom) && geom.length >= 42) {
    const bytes = new Uint8Array(geom.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(geom.slice(i * 2, i * 2 + 2), 16);
    const view = new DataView(bytes.buffer);
    const order = view.getUint8(0);
    if (order !== 0 && order !== 1) return null;
    const little = order === 1;
    const type = view.getUint32(1, little);
    const hasSrid = (type & 0x20000000) !== 0;
    // The point type, with the EWKB flags removed; ISO WKB writes a 3D point
    // as 1001, which is still a point.
    if ((type & 0x0fffffff) % 1000 !== 1) return null;
    let offset = 5;
    if (hasSrid) {
      if (bytes.length < offset + 4) return null;
      const srid = view.getUint32(offset, little);
      if (srid !== 4326) return null;
      offset += 4;
    }
    if (bytes.length < offset + 16) return null;
    lng = view.getFloat64(offset, little);
    lat = view.getFloat64(offset + 8, little);
  } else {
    return null;
  }

  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}
