import type { Translate } from "@/lib/i18n";

/**
 * Who a sentence about a resident names: the resident by name, or, when the
 * profile carries none, the holder of the account by the ending of its phone
 * number. A dialog must never read [Verify Name not set].
 *
 * `of` is the form after [the verification of]; English is the same either
 * way, Tagalog changes its marker.
 */
export function residentWho(
  resident: { name: string | null; phoneEnding: string | null },
  t: Translate,
  form: "subject" | "of" = "subject"
): string {
  const of = form === "of";
  if (resident.name) return t(of ? "verify.who.nameOf" : "verify.who.name", { name: resident.name });
  if (resident.phoneEnding) {
    return t(of ? "verify.who.phoneOf" : "verify.who.phone", { digits: resident.phoneEnding });
  }
  return t(of ? "verify.who.accountOf" : "verify.who.account");
}

/** A sentence that begins with a [who] phrase still starts with a capital. */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
