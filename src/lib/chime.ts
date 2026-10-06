"use client";

let context: AudioContext | null = null;

/**
 * An alarm-style chime for a new Tier 0 emergency arriving in the queue: a
 * continuous square-wave tone that sweeps up and down twice, a wail rather
 * than discrete notes. Two fixed pitches read as a chime regardless of which
 * two notes they are — the envelope is what says "alarm" versus "ping", and
 * a sweeping siren is the one almost everyone already recognises as urgent.
 * Louder and harsher on purpose — this fires for the highest-priority tier,
 * at a desk, possibly unattended.
 *
 * Synthesised with the Web Audio API rather than shipped as a file: nothing
 * to host, nothing to fetch, and no dependency on the artifact/CDN rules of
 * wherever this ends up deployed.
 *
 * Browsers refuse to start audio until the page has had a user gesture, and a
 * chime is never fired by one — it comes from a Realtime event. Signing in
 * counts only until the page is reloaded: a queue reopened from a bookmark or
 * refreshed has had no gesture, and its first arrival would be silent. So the
 * queue calls primeChime() on the first click or key press, and says on screen
 * that sound is waiting for one. If the browser still refuses, the alert is
 * skipped — the report is on screen regardless.
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

/**
 * Creates and resumes the audio context inside a user gesture, so that later
 * chimes, which no gesture triggers, are allowed to play. Call it from a
 * click or key handler; outside one, resume() simply stays pending.
 */
export function primeChime(): void {
  try {
    if (context === null) context = new AudioContext();
    if (context.state !== "running") void context.resume().catch(() => {});
  } catch {
    // No audio available in this environment.
  }
}

// A continuous siren wail: the pitch rises and falls, SIREN_CYCLES times,
// between SIREN_LOW and SIREN_HIGH, over SIREN_DURATION seconds total.
const SIREN_LOW = 700;
const SIREN_HIGH = 1500;
const SIREN_CYCLES = 2;
const SIREN_DURATION = 1.1;

function playTones(ctx: AudioContext): void {
  const start = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  // Square, not sine: the extra harmonics read as an alarm rather than a
  // notification ping, and carry further at the same peak gain.
  oscillator.type = "square";

  // One hard attack and one release wrap the whole wail — not one soft
  // ramp per note, which is what made two fixed pitches still read as a
  // chime. A near-instant attack (2 ms) reads as an alert going off, not a
  // tone fading in. 0.6 is louder than a square wave's harmonics can take
  // before the destination clips at 1.0, so this is close to the loudest
  // this can go without distorting.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(0.6, start + 0.002);
  gain.gain.setValueAtTime(0.6, start + SIREN_DURATION - 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + SIREN_DURATION);

  // The up-down sweep. linearRampToValueAtTime between alternating highs and
  // lows, back to back, is a standard way to script a continuous siren wail
  // on one oscillator — each ramp picks up from wherever the last left off.
  oscillator.frequency.setValueAtTime(SIREN_LOW, start);
  const cycleDuration = SIREN_DURATION / SIREN_CYCLES;
  for (let i = 0; i < SIREN_CYCLES; i++) {
    const cycleStart = start + i * cycleDuration;
    oscillator.frequency.linearRampToValueAtTime(SIREN_HIGH, cycleStart + cycleDuration / 2);
    oscillator.frequency.linearRampToValueAtTime(SIREN_LOW, cycleStart + cycleDuration);
  }

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + SIREN_DURATION + 0.02);
}
