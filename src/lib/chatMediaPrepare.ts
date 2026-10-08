import {
  MAX_MEDIA_BYTES,
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_EDGE,
  PHOTO_MIME,
  VIDEO_MIME,
  dimensionHint,
  inspectMp4,
  kindOfFile,
  jpegMetadataSegments,
  videoDurationSeconds,
  type MediaKind,
  type PickRefusal,
} from "@/lib/chatMedia";

/**
 * Turns a file the official picked into one that may be sent (REPORT_CHAT_MEDIA).
 * Browser only: it decodes images on a canvas and reads a video's length
 * through a <video> element.
 *
 * - A photo is decoded and drawn again as a JPEG, its longer edge at most
 *   PHOTO_MAX_EDGE. The new file carries none of the original's metadata
 *   (EXIF, XMP, GPS), and it is checked for that before it is kept, so a
 *   browser that ever copied metadata would fail closed. The browser applies
 *   the camera's rotation when it decodes, so the photo stays upright.
 * - A video is kept as it is: a browser has no encoder this console could
 *   use to strip its metadata. It must be an MP4 of at most 30 seconds and
 *   25 MB, and it is refused if it records where it was taken (the location
 *   markers phone cameras write). Its recording time and the device's
 *   encoder strings stay in it.
 *
 * The backend can't check any of this: it sees a path, a type and a size.
 *
 * Loaded only when an official picks a file (a dynamic import in
 * ReportChatSection), so the queue page doesn't carry it.
 */

/** A file ready to upload, and what the composer shows for it. */
export interface PreparedMedia {
  // A local key for the composer's list; never sent.
  key: string;
  kind: MediaKind;
  mime: typeof PHOTO_MIME | typeof VIDEO_MIME;
  blob: Blob;
  bytes: number;
  width?: number;
  height?: number;
  durationS?: number;
  // An object URL for the composer's preview (photos only); revoke it when
  // the file leaves the composer.
  previewUrl: string | null;
}

export type PrepareResult = { ok: true; media: PreparedMedia } | { ok: false; reason: PickRefusal };

export async function prepareFile(file: File): Promise<PrepareResult> {
  const kind = kindOfFile(file);
  if (kind === "photo") return preparePhoto(file);
  if (kind === "video") return prepareVideo(file);
  return { ok: false, reason: "file-type" };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, PHOTO_MIME, PHOTO_JPEG_QUALITY));
}

async function preparePhoto(file: File): Promise<PrepareResult> {
  const source = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(source);
  } catch {
    // HEIC outside Safari, a damaged file, or not an image at all.
    return { ok: false, reason: "photo-unreadable" };
  } finally {
    URL.revokeObjectURL(source);
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!(w > 0 && h > 0)) return { ok: false, reason: "photo-unreadable" };
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false, reason: "photo-unreadable" };
  // A transparent PNG would turn black as a JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToJpeg(canvas);
  if (!blob || blob.size === 0) return { ok: false, reason: "photo-unreadable" };
  if (blob.size > MAX_MEDIA_BYTES) return { ok: false, reason: "photo-too-large" };
  try {
    // A 1600 px JPEG is a few hundred KB; reading it whole is cheap.
    if (jpegMetadataSegments(new Uint8Array(await blob.arrayBuffer())).length > 0) {
      return { ok: false, reason: "photo-metadata" };
    }
  } catch {
    return { ok: false, reason: "photo-unreadable" };
  }

  return {
    ok: true,
    media: {
      key: crypto.randomUUID(),
      kind: "photo",
      mime: PHOTO_MIME,
      blob,
      bytes: blob.size,
      width: dimensionHint(canvas.width),
      height: dimensionHint(canvas.height),
      previewUrl: URL.createObjectURL(blob),
    },
  };
}

function readVideoMetadata(url: string): Promise<{ durationMs: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const done = () => {
      video.removeAttribute("src");
      video.load();
    };
    video.onloadedmetadata = () => {
      const result = { durationMs: video.duration * 1000, width: video.videoWidth, height: video.videoHeight };
      done();
      resolve(result);
    };
    video.onerror = () => {
      done();
      reject(new Error("video metadata failed"));
    };
    video.src = url;
  });
}

async function prepareVideo(file: File): Promise<PrepareResult> {
  // Only MP4 is stored (the bucket allows video/mp4 and nothing else).
  if (file.type !== VIDEO_MIME && !(file.type === "" && /\.mp4$/i.test(file.name))) {
    return { ok: false, reason: "video-not-mp4" };
  }
  if (file.size === 0) return { ok: false, reason: "video-unreadable" };
  // Size before anything is read: a 200 MB file is never opened only to be refused.
  if (file.size > MAX_MEDIA_BYTES) return { ok: false, reason: "video-too-large" };

  const source = URL.createObjectURL(file);
  let meta: { durationMs: number; width: number; height: number };
  try {
    meta = await readVideoMetadata(source);
  } catch {
    return { ok: false, reason: "video-unreadable" };
  } finally {
    URL.revokeObjectURL(source);
  }
  if (!Number.isFinite(meta.durationMs) || meta.durationMs <= 0) return { ok: false, reason: "video-unreadable" };
  const durationS = videoDurationSeconds(meta.durationMs);
  if (durationS === null) return { ok: false, reason: "video-too-long" };

  const shape = await inspectMp4(
    async (position, length) => new Uint8Array(await file.slice(position, position + length).arrayBuffer()),
    file.size
  ).catch(() => ({ ok: false as const, reason: "not_mp4" as const }));
  if (!shape.ok) return { ok: false, reason: shape.reason === "location" ? "video-location" : "video-not-mp4" };

  return {
    ok: true,
    media: {
      key: crypto.randomUUID(),
      kind: "video",
      mime: VIDEO_MIME,
      // Typed explicitly: an untyped .mp4 must still upload as video/mp4.
      blob: file.type === VIDEO_MIME ? file : new Blob([file], { type: VIDEO_MIME }),
      bytes: file.size,
      width: dimensionHint(meta.width),
      height: dimensionHint(meta.height),
      durationS,
      previewUrl: null,
    },
  };
}
