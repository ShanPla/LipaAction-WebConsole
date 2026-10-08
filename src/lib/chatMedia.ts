import type { ChatThread, SendOutcome } from "@/lib/reportChat";

/**
 * Chat media (REPORT_CHAT_MEDIA): photos and short videos in the v2 chat's
 * two threads. What the client and server halves share, and nothing that
 * needs a browser, so it can be checked on its own.
 *
 * The backend owns every rule (its docs/specs/2026-10-08-report-chat-media-design.md
 * and migration 20261126090000); the limits below repeat its numbers so the
 * official hears about a file that can't go before it is uploaded. They are
 * the report-media limits the resident app already uses for a report's own
 * photo or video (the backend's apps/mobile/lib/media.ts).
 */

/** The private Storage bucket. Never read through a public URL: it has none. */
export const CHAT_MEDIA_BUCKET = "report-chat-media";

/** 25 MiB: the bucket's file_size_limit and the attachments table's bytes CHECK. */
export const MAX_MEDIA_BYTES = 26214400;
/** Per message: 1 to 4 photos, or exactly 1 video, never both. */
export const MAX_PHOTOS = 4;
/** A video is more than 0 and at most 30.0 seconds (duration_s numeric(4,1)). */
export const MAX_VIDEO_SECONDS = 30;
/**
 * A recording stopped at a camera's 30-second limit can run a frame or two
 * over (30033 ms). Up to this much over is sent as exactly 30.0 s, as the
 * resident app does; anything longer is refused.
 */
export const VIDEO_LIMIT_TOLERANCE_MS = 500;
/** Width and height are optional display hints, whole numbers 1 to 10000. */
export const MAX_DIMENSION = 10000;

/** Photos are re-encoded to JPEG in the browser (which drops EXIF and XMP); videos must already be MP4. */
export const PHOTO_MIME = "image/jpeg";
export const VIDEO_MIME = "video/mp4";
/** The longer edge after the re-encode, and the JPEG quality: the resident app's numbers. */
export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_JPEG_QUALITY = 0.7;

/**
 * How long a signed URL works, in seconds. Short on purpose: a URL already
 * handed out keeps working until it expires, even after the reader loses
 * access (a recall, a withdrawn consent). The drawer signs again when one
 * runs out.
 */
export const SIGNED_URL_SECONDS = 300;

export type MediaKind = "photo" | "video";

/** The columns a client may read; sender_id is not readable, so never select *. */
export const ATTACHMENT_COLUMNS =
  "id, report_id, thread, message_id, storage_path, kind, mime, bytes, width, height, duration_s, created_at";

export interface ChatAttachment {
  id: string;
  messageId: string;
  path: string;
  kind: MediaKind;
  bytes: number;
  width: number | null;
  height: number | null;
  // Videos only, in seconds (one decimal).
  durationS: number | null;
  createdAt: string;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_RE = new RegExp(`^${UUID}$`);
// The attachments table's storage_path CHECK and the upload policy's shape.
const PATH_RE = new RegExp(`^${UUID}/(group|desk)/${UUID}/${UUID}\\.(jpg|mp4)$`);

/**
 * One row of report_chat_attachments as an attachment. null for anything
 * half-shaped, which is not drawn.
 */
export function toChatAttachment(row: unknown): ChatAttachment | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.message_id !== "string") return null;
  if (typeof r.storage_path !== "string" || !PATH_RE.test(r.storage_path)) return null;
  if (r.kind !== "photo" && r.kind !== "video") return null;
  if (typeof r.created_at !== "string") return null;
  const dim = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= MAX_DIMENSION ? v : null);
  // numeric arrives as a number from PostgREST; a string is read too.
  const duration = typeof r.duration_s === "number" ? r.duration_s : typeof r.duration_s === "string" ? Number(r.duration_s) : NaN;
  return {
    id: r.id,
    messageId: r.message_id,
    path: r.storage_path,
    kind: r.kind,
    bytes: typeof r.bytes === "number" ? r.bytes : 0,
    width: dim(r.width),
    height: dim(r.height),
    durationS: r.kind === "video" && Number.isFinite(duration) && duration > 0 ? duration : null,
    createdAt: r.created_at,
  };
}

/** A message's attachments in the order they were sent. */
export function sortAttachments(list: ChatAttachment[]): ChatAttachment[] {
  return [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id)
  );
}

/**
 * '<report>/<thread>/<message>/<object>.<jpg|mp4>', all ids lower case, as
 * the upload policy and the send function require. Throws on an id that is
 * not a UUID, so nothing a caller passes can put '..' or a '/' in the path.
 */
export function chatMediaPath(
  reportId: string,
  thread: ChatThread,
  messageId: string,
  objectId: string,
  kind: MediaKind
): string {
  const ids = [reportId, messageId, objectId].map((id) => id.toLowerCase());
  if (!ids.every((id) => UUID_RE.test(id))) throw new Error("Chat media path: an id is not a UUID");
  if (thread !== "group" && thread !== "desk") throw new Error("Chat media path: unknown thread");
  return `${ids[0]}/${thread}/${ids[1]}/${ids[2]}.${kind === "photo" ? "jpg" : "mp4"}`;
}

/**
 * The length to send as duration_s, from milliseconds: rounded UP to the
 * tenth so the stored length is never shorter than the video, capped at
 * 30.0 inside the tolerance. null when unknown, zero, or too long.
 */
export function videoDurationSeconds(durationMs: number | null | undefined): number | null {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) return null;
  if (durationMs > MAX_VIDEO_SECONDS * 1000 + VIDEO_LIMIT_TOLERANCE_MS) return null;
  return Math.min(MAX_VIDEO_SECONDS, Math.ceil(durationMs / 100) / 10);
}

/** A width or height worth sending: a whole number in range, or nothing. */
export function dimensionHint(value: number | null | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const n = Math.round(value);
  return n >= 1 && n <= MAX_DIMENSION ? n : undefined;
}

/** What the send function takes for one file (p_attachments' items). */
export interface AttachmentInput {
  path: string;
  kind: MediaKind;
  mime: typeof PHOTO_MIME | typeof VIDEO_MIME;
  bytes: number;
  width?: number;
  height?: number;
  duration_s?: number;
}

/**
 * Checks a list of attachments against the send function's rules for this
 * report, thread and message, and returns a clean copy (only the known
 * keys), or null. The server action runs it, since a Server Action is a
 * public endpoint whatever the composer allows.
 */
export function cleanAttachments(
  value: unknown,
  reportId: string,
  thread: ChatThread,
  messageId: string
): AttachmentInput[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_PHOTOS) return null;
  const prefix = `${reportId.toLowerCase()}/${thread}/${messageId.toLowerCase()}/`;
  const seen = new Set<string>();
  const out: AttachmentInput[] = [];
  let photos = 0;
  let videos = 0;
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const a = item as Record<string, unknown>;
    const isPhoto = a.kind === "photo" && a.mime === PHOTO_MIME;
    const isVideo = a.kind === "video" && a.mime === VIDEO_MIME;
    if (!isPhoto && !isVideo) return null;
    if (typeof a.path !== "string" || !a.path.startsWith(prefix) || !PATH_RE.test(a.path)) return null;
    if (!a.path.endsWith(isPhoto ? ".jpg" : ".mp4") || seen.has(a.path)) return null;
    seen.add(a.path);
    if (typeof a.bytes !== "number" || !Number.isInteger(a.bytes) || a.bytes < 1 || a.bytes > MAX_MEDIA_BYTES) return null;
    const clean: AttachmentInput = {
      path: a.path,
      kind: isPhoto ? "photo" : "video",
      mime: isPhoto ? PHOTO_MIME : VIDEO_MIME,
      bytes: a.bytes,
    };
    for (const key of ["width", "height"] as const) {
      if (a[key] === undefined || a[key] === null) continue;
      const v = a[key];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > MAX_DIMENSION) return null;
      clean[key] = v;
    }
    if (isVideo) {
      const d = a.duration_s;
      if (typeof d !== "number" || !(d > 0 && d <= MAX_VIDEO_SECONDS)) return null;
      if (Math.abs(d * 10 - Math.round(d * 10)) > 1e-9) return null;
      clean.duration_s = d;
      videos += 1;
    } else {
      if (a.duration_s !== undefined && a.duration_s !== null) return null;
      photos += 1;
    }
    out.push(clean);
  }
  if (videos > 1 || (videos === 1 && photos > 0)) return null;
  return out;
}

/**
 * How a media send ended: every text-send answer, plus the ones only media
 * has. A code, not a sentence; the drawer words it.
 *
 * - media-invalid: the send function refused the list of files (22023 on
 *   anything but the text), or a stored file differs from what was said.
 * - media-missing: a file is not in the bucket, or not uploaded by this
 *   account (55000 media_missing).
 * - upload-refused: Storage refused an upload: the chat is closed, the
 *   report is out of scope, or too many files were sent in a short time.
 * - upload-too-large: Storage says a file is over its limit.
 * - upload-failed: any other failed upload.
 */
export type MediaSendOutcome =
  | SendOutcome
  | "media-invalid"
  | "media-missing"
  | "upload-refused"
  | "upload-too-large"
  | "upload-failed";

/** Why a picked file was not attached; the drawer words it. */
export type PickRefusal =
  | "too-many"
  | "mixed"
  | "file-type"
  | "photo-unreadable"
  | "photo-too-large"
  | "photo-metadata"
  | "video-unreadable"
  | "video-too-long"
  | "video-too-large"
  | "video-not-mp4"
  | "video-location";

/**
 * Whether one more file of `kind` fits beside what is already attached:
 * up to 4 photos, or 1 video alone.
 */
export function canAddKind(attached: MediaKind[], kind: MediaKind): true | "too-many" | "mixed" {
  if (attached.length === 0) return true;
  if (attached.includes("video")) return kind === "video" ? "too-many" : "mixed";
  if (kind === "video") return "mixed";
  return attached.length < MAX_PHOTOS ? true : "too-many";
}

// --- JPEG: the check after the re-encode, the resident app's checkPhotoForUpload ---

export type JpegMetadata = "exif" | "xmp";

const ascii = (bytes: Uint8Array, from: number, text: string) =>
  [...text].every((c, i) => bytes[from + i] === c.charCodeAt(0));

/**
 * The metadata segments in a JPEG's header: an APP1 that starts "Exif\0\0"
 * (where GPS lives) or the XMP namespace (which can carry GPS too). Throws on
 * a file that is not a JPEG or whose header is cut short, so a caller fails
 * closed.
 */
export function jpegMetadataSegments(bytes: Uint8Array): JpegMetadata[] {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Not a JPEG");
  const found: JpegMetadata[] = [];
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) throw new Error(`Not a JPEG segment at byte ${i}`);
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) return found;
    if (marker >= 0xd0 && marker <= 0xd7) {
      i += 2;
      continue;
    }
    if (i + 4 > bytes.length) throw new Error("JPEG header truncated");
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2 || i + 2 + len > bytes.length) throw new Error("JPEG header truncated");
    if (marker === 0xe1) {
      if (ascii(bytes, i + 4, "Exif\0\0")) found.push("exif");
      else if (ascii(bytes, i + 4, "http://ns.adobe.com/xap/1.0/\0")) found.push("xmp");
    }
    i += 2 + len;
  }
  throw new Error("JPEG header truncated");
}

// --- MP4: the location scan, the resident app's inspectMp4 ---

/** Reads `length` bytes of the file from `position` (fewer at the end). */
export type ByteReader = (position: number, length: number) => Promise<Uint8Array>;

const fourCC = (b: Uint8Array, at: number) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);
const u32 = (b: Uint8Array, at: number) => ((b[at] << 24) >>> 0) + (b[at + 1] << 16) + (b[at + 2] << 8) + b[at + 3];
// QuickTime (.mov) and 3GPP files are ISO-BMFF too, but not MP4.
const NOT_MP4_BRANDS = /^(qt {2}|3g)/;
// Where phone cameras write the recording location inside 'moov': the 0xA9
// 'xyz' atom (Android), 'loci' (3GPP), and Apple's location.ISO6709 key.
const LOCATION_MARKERS: Uint8Array[] = [
  Uint8Array.of(0xa9, 0x78, 0x79, 0x7a),
  Uint8Array.of(0x6c, 0x6f, 0x63, 0x69),
  new TextEncoder().encode("location.ISO6709"),
];

function containsBytes(hay: Uint8Array, needle: Uint8Array): boolean {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

/** Whether a 'moov' box carries a recording location. A byte scan: it can over-refuse, never under-refuse what it knows. */
export function moovCarriesLocation(moov: Uint8Array): boolean {
  return LOCATION_MARKERS.some((m) => containsBytes(moov, m));
}

const MAX_TOP_LEVEL_BOXES = 64;
export type Mp4Inspection = { ok: true } | { ok: false; reason: "not_mp4" | "location" };

/**
 * Walks the file's top-level boxes: it must open with an 'ftyp' whose brand
 * is not QuickTime or 3GPP, and its 'moov' must carry no location. Fails
 * closed: a box past the end of the file, or no 'moov', is not_mp4.
 *
 * A browser has no video encoder this console could use to strip a video's
 * metadata, so a video that records where it was taken is refused rather
 * than cleaned. What stays in an accepted video: its recording time and the
 * device's encoder strings.
 */
export async function inspectMp4(read: ByteReader, fileSize: number): Promise<Mp4Inspection> {
  const notMp4: Mp4Inspection = { ok: false, reason: "not_mp4" };
  if (!(fileSize >= 16)) return notMp4;
  let pos = 0;
  for (let n = 0; n < MAX_TOP_LEVEL_BOXES && pos < fileSize; n++) {
    const h = await read(pos, Math.min(16, fileSize - pos));
    if (h.length < 8) return notMp4;
    let size = u32(h, 0);
    const type = fourCC(h, 4);
    let header = 8;
    if (size === 1) {
      if (h.length < 16) return notMp4;
      size = u32(h, 8) * 2 ** 32 + u32(h, 12);
      header = 16;
    } else if (size === 0) {
      size = fileSize - pos;
    }
    if (size < header || pos + size > fileSize) return notMp4;
    if (n === 0 && (type !== "ftyp" || h.length < 12 || NOT_MP4_BRANDS.test(fourCC(h, 8)))) return notMp4;
    if (type === "moov") {
      const moov = await read(pos, size);
      if (moov.length !== size) return notMp4;
      return moovCarriesLocation(moov) ? { ok: false, reason: "location" } : { ok: true };
    }
    pos += size;
  }
  return notMp4;
}

/** Which kind a picked file is, from its type (or, for an untyped file, its name). */
export function kindOfFile(file: Pick<File, "type" | "name">): MediaKind | null {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "" && /\.mp4$/i.test(file.name)) return "video";
  return null;
}

/** m:ss for a video's length. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "";
  const whole = Math.ceil(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
