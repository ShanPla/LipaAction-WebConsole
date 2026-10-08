"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CHAT_MEDIA_BUCKET, SIGNED_URL_SECONDS } from "@/lib/chatMedia";

/*
 * Short-lived signed URLs for chat media (REPORT_CHAT_MEDIA).
 *
 * The bucket is private: a file is read only through a signed URL, and the
 * Storage API signs one only for a file the official may read (an
 * attachment row their account can see names it). URLs are asked for only
 * when a file is about to be shown, a page of them in one request, and kept
 * until a minute before they run out. A URL that has expired by the time
 * the browser loads it is signed again once.
 */

// Reused while at least this long is left.
const REUSE_MARGIN_MS = 60_000;

type Entry = { url: string; expiresAt: number };
const cache = new Map<string, Entry>();
let queued = new Map<string, Array<(url: string | null) => void>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  flushTimer = null;
  const batch = queued;
  queued = new Map();
  const paths = [...batch.keys()];
  if (paths.length === 0) return;
  const answer = (path: string, url: string | null) => batch.get(path)?.forEach((resolve) => resolve(url));
  try {
    const expiresAt = Date.now() + SIGNED_URL_SECONDS * 1000;
    const { data, error } = await createClient().storage.from(CHAT_MEDIA_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (error || !data) {
      paths.forEach((p) => answer(p, null));
      return;
    }
    const signed = new Map<string, string>();
    for (const item of data) {
      if (item.path && item.signedUrl && !item.error) signed.set(item.path, item.signedUrl);
    }
    for (const p of paths) {
      const url = signed.get(p) ?? null;
      if (url) cache.set(p, { url, expiresAt });
      answer(p, url);
    }
  } catch {
    paths.forEach((p) => answer(p, null));
  }
}

/** A signed URL for one path, from the cache or the next batch; null when it can't be signed. */
function signedUrl(path: string, fresh: boolean): Promise<string | null> {
  const hit = cache.get(path);
  if (!fresh && hit && hit.expiresAt - Date.now() > REUSE_MARGIN_MS) return Promise.resolve(hit.url);
  cache.delete(path);
  return new Promise((resolve) => {
    const waiting = queued.get(path) ?? [];
    waiting.push(resolve);
    queued.set(path, waiting);
    // Every tile that becomes visible in the same moment joins one request.
    if (flushTimer === null) flushTimer = setTimeout(() => void flush(), 0);
  });
}

/**
 * The signed URL for `path`, asked for once `wanted` is true (the tile is
 * near the screen, or the viewer is open). `onLoadError` is for the <img>
 * or <video> that failed to load: the URL is signed once more, in case it
 * ran out; a second failure is final.
 */
export function useSignedMediaUrl(path: string, wanted: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const retried = useRef(false);

  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    void signedUrl(path, false).then((next) => {
      if (cancelled) return;
      setUrl(next);
      setFailed(next === null);
    });
    return () => {
      cancelled = true;
    };
  }, [path, wanted]);

  const onLoadError = useCallback(() => {
    if (retried.current) {
      setFailed(true);
      return;
    }
    retried.current = true;
    void signedUrl(path, true).then((next) => {
      setUrl(next);
      setFailed(next === null);
    });
  }, [path]);

  return { url, failed, onLoadError };
}

/**
 * Whether an element is on or near the screen, so a tile asks for its URL
 * only then. Stays true once seen. Without IntersectionObserver it is true
 * at once.
 */
export function useNearScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return { ref, near };
}
