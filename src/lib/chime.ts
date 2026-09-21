"use client";

let context: AudioContext | null = null;

/**
 * A short two-note chime for a new Tier 0 emergency arriving in the queue.
 *
 * Synthesised with the Web Audio API rather than shipped as a file: nothing
 * to host, nothing to fetch, and no dependency on the artifact/CDN rules of
 * wherever this ends up deployed. Browsers refuse to start audio before the
 * page has had a user gesture; by the time an official is on the queue they
 * have signed in, so the context can be created lazily on first use. If the
 * browser still refuses, the alert is silently skipped — a chime is a
 * courtesy, and the report is on screen regardless.
 */
export function playChime(): void {
  try {
    if (context === null) context = new AudioContext();
    const ctx = context;
    if (ctx.state === "running") {
      playTones(ctx);
      return;
    }
    // Suspended by the browser's autoplay policy. resume() only settles once
    // the page has had a user gesture — possibly hours later — and tones
    // scheduled now would all play THEN, as a burst announcing reports long
    // since handled. So the chime only plays if the context is running
    // within a moment; otherwise it is skipped. The report is on screen either
    // way, and the [New] marker still shows.
    const settled = ctx.resume().then(
      () => ctx.state === "running",
      () => false
    );
    const tooLate = new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 300));
    void Promise.race([settled, tooLate]).then((running) => {
      if (running) playTones(ctx);
    });
  } catch {
    // No audio available in this environment.
  }
}

function playTones(ctx: AudioContext): void {
  const start = ctx.currentTime;
  tone(ctx, 880, start, 0.12);
  tone(ctx, 1175, start + 0.14, 0.18);
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  // Ramp in and out so it doesn't click.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}
