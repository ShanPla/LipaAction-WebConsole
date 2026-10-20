// Self-check for the resident profile and manual sanctions screens:
// src/lib/residentProfile.ts (role gate, RPC names and arguments, evidence
// rules, reason rules, error mapping, the ladder text, the loaders against a
// mock Supabase client) and the real SanctionForm / card / history components
// rendered to HTML in each state. No database, no browser, no test framework,
// and nothing here touches a live project: every RPC is a mock.
//
//   npm run check:residentprofile
//
// Needs Node >= 22.18 (it strips the .ts types on import). The .tsx files and
// the "@/" alias are handled by a small loader registered below, which compiles
// with the repo's own TypeScript. The server action module, next/link and the
// app shell are replaced by stubs (the real action is server-only). Exits 1 if any
// check fails.

import { register } from "node:module";

const rootUrl = new URL("../", import.meta.url).href;

const hooks = `
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const ROOT = ${JSON.stringify(rootUrl)};
const ts = createRequire(ROOT + "package.json")("typescript");
const STUB = "data:text/javascript," + encodeURIComponent(
  "export async function applyManualSanction(a){ (globalThis.__sanctionCalls ??= []).push(a); return { ok: true }; }" +
  "export async function findResidentLink(){ return null; }");
const LINK = "data:text/javascript," + encodeURIComponent(
  "const h = (...a) => globalThis.__h(...a); export default function Link({ href, children, ...r }) { return h('a', { href, ...r }, children); }");
const SHELL = "data:text/javascript," + encodeURIComponent(
  "const h = (...a) => globalThis.__h(...a); export function AppShell({ children }) { return h('div', null, children); }");
export async function resolve(specifier, context, next) {
  if (specifier === "@/app/actions/residentProfile") return { url: STUB, shortCircuit: true };
  if (specifier === "next/link") return { url: LINK, shortCircuit: true };
  if (specifier === "@/components/layout/AppShell") return { url: SHELL, shortCircuit: true };
  const relative = specifier.startsWith("./") || specifier.startsWith("../");
  if (specifier.startsWith("@/") || (relative && context.parentURL?.startsWith(ROOT) && !/\\.\\w+$/.test(specifier))) {
    const base = specifier.startsWith("@/")
      ? fileURLToPath(new URL("src/" + specifier.slice(2), ROOT))
      : fileURLToPath(new URL(specifier, context.parentURL));
    for (const candidate of [base + ".ts", base + ".tsx", base + "/index.ts", base + "/index.tsx"]) {
      if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.startsWith("file:") && (url.endsWith(".ts") || url.endsWith(".tsx"))) {
    const out = ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    });
    return { format: "module", source: out.outputText, shortCircuit: true };
  }
  return next(url, context);
}
`;
register("data:text/javascript," + encodeURIComponent(hooks), import.meta.url);

globalThis.__h = (await import("react")).createElement;
const src = (p) => new URL(`../src/${p}`, import.meta.url).href;
const lib = await import(src("lib/residentProfile.ts"));
const { MESSAGES } = await import(src("lib/messages.ts"));
const form = await import(src("app/residents/[id]/SanctionForm.tsx"));
const view = await import(src("app/residents/[id]/ResidentProfileClient.tsx"));
const { createElement: h } = await import("react");
const { renderToStaticMarkup } = (await import("react-dom/server")).default;
const { readFileSync } = await import("node:fs");

console.error = () => {};

let pass = 0;
let fail = 0;
function check(name, actual, expected) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (same) pass += 1;
  else fail += 1;
  console.log(`${same ? "ok  " : "FAIL"} ${name}${same ? "" : `: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}
const has = (html, text) => html.includes(text);
const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");

const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const RESIDENT = uid(1);
const reports = Array.from({ length: 12 }, (_, i) => uid(100 + i));

// --- Contract names (pinned to the 20261210090000 / 20261210110000 migrations) ---
check("RPC names", lib.RPC, {
  reporterRef: "report_reporter_ref",
  card: "resident_profile_card",
  history: "resident_report_history",
  sanction: "apply_manual_sanction",
});

// --- Role gate: desk sees nothing; admin inaccurate only; senior both -------
check("desk officer cannot view", lib.canViewResidentProfile("barangay_official"), false);
for (const r of ["municipal_admin", "dpo", "resident", "agency_user", "agency_supervisor", null, undefined, ""]) {
  check(`${r} cannot view`, lib.canViewResidentProfile(r), false);
}
check("barangay_admin can view and sanction", [lib.canViewResidentProfile("barangay_admin"), lib.canSanction("barangay_admin")], [true, true]);
check("senior admin can view", lib.canViewResidentProfile("senior_barangay_admin"), true);
check("malicious: barangay_admin no", lib.canSanctionMalicious("barangay_admin"), false);
check("malicious: desk no", lib.canSanctionMalicious("barangay_official"), false);
check("malicious: senior admin yes", lib.canSanctionMalicious("senior_barangay_admin"), true);

// --- Mock client ------------------------------------------------------------
function mockClient(handlers) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) => {
      calls.push({ name, args });
      const hdl = handlers[name];
      return hdl ? hdl(args) : { data: null, error: null, status: 200 };
    },
  };
}
const cardRow = {
  resident_id: RESIDENT, display_name: "Juan Dela Cruz", barangay_name: "Tambo", trust_tier: "tier1", trust_score: "0.450",
  member_since: "2026-01-02T00:00:00Z", sanction_state: "none", cooldown_until: null, suspension_status: null,
  inaccurate_strike_count: 1, malicious_strike_count: 0, visible_report_count: 3,
};

// --- Zero card rows = 404 (card null); refusal = 404; outage = failure ------
check("card: zero rows is null", (await lib.loadResidentCard(mockClient({ resident_profile_card: () => ({ data: [], error: null, status: 200 }) }), RESIDENT)), { ok: true, card: null });
check("card: 42501 is treated as not found", (await lib.loadResidentCard(mockClient({ resident_profile_card: () => ({ data: null, error: { code: "42501", message: "x" }, status: 403 }) }), RESIDENT)), { ok: true, card: null });
check("card: other error is an outage, not a 404", (await lib.loadResidentCard(mockClient({ resident_profile_card: () => ({ data: null, error: { code: "XX000", message: "x" }, status: 500 }) }), RESIDENT)), { ok: false });
const okCard = await lib.loadResidentCard(mockClient({ resident_profile_card: () => ({ data: [cardRow], error: null, status: 200 }) }), RESIDENT);
check("card: normalised", [okCard.ok, okCard.card?.trustScore, okCard.card?.visibleReportCount, okCard.card?.inaccurateStrikes], [true, 0.45, 3, 1]);

// --- "View resident profile" link --------------------------------------------
{
  const c = mockClient({ report_reporter_ref: () => ({ data: null, error: null, status: 200 }) });
  check("no link when report_reporter_ref is NULL", await lib.loadResidentLink(c, reports[0]), null);
  check("...and the card is never asked for", c.calls.map((x) => x.name), ["report_reporter_ref"]);
}
{
  const c = mockClient({
    report_reporter_ref: () => ({ data: RESIDENT, error: null, status: 200 }),
    resident_profile_card: () => ({ data: [], error: null, status: 200 }),
  });
  check("no link when the card has zero rows", await lib.loadResidentLink(c, reports[0]), null);
}
{
  const c = mockClient({
    report_reporter_ref: () => ({ data: RESIDENT, error: null, status: 200 }),
    resident_profile_card: () => ({ data: [cardRow], error: null, status: 200 }),
  });
  check("link when ref and card both come back", await lib.loadResidentLink(c, reports[0]), `/residents/${RESIDENT}`);
  check("...ref called with p_report_id", c.calls[0], { name: "report_reporter_ref", args: { p_report_id: reports[0] } });
}
check("no link for a refused desk call (42501)", await lib.loadResidentLink(mockClient({ report_reporter_ref: () => ({ data: null, error: { code: "42501" }, status: 403 }) }), reports[0]), null);
check("no link for a malformed report id (no call)", await lib.loadResidentLink(mockClient({}), "nope"), null);

// --- Evidence list: order, cap, only offered ---------------------------------
{
  let sel = [];
  for (const id of reports.slice(0, 3)) sel = lib.toggleEvidence(sel, id, reports);
  check("evidence keeps tick order (first is primary)", sel, reports.slice(0, 3));
  check("unticking removes it", lib.toggleEvidence(sel, reports[1], reports), [reports[0], reports[2]]);
  let full = [];
  for (const id of reports) full = lib.toggleEvidence(full, id, reports);
  check("evidence capped at 10", full.length, 10);
  check("the 11th tick is ignored", lib.toggleEvidence(full, reports[11], reports), full);
  check("an id not in the history is ignored", lib.toggleEvidence([], uid(999), reports), []);
}

// --- Sanction input: primary + rest, reason length ---------------------------
const base = { residentId: RESIDENT, reportIds: [reports[2], reports[0], reports[1]], track: "inaccurate", reason: "x".repeat(20) };
check("first chosen is primary, rest are more", (({ primaryReportId, moreReportIds }) => ({ primaryReportId, moreReportIds }))(lib.normalizeSanctionInput(base)), { primaryReportId: reports[2], moreReportIds: [reports[0], reports[1]] });
check("args: several evidence include p_more_report_ids", lib.sanctionArgs(lib.normalizeSanctionInput(base)), {
  p_resident_id: RESIDENT, p_report_id: reports[2], p_track: "inaccurate", p_reason: "x".repeat(20), p_more_report_ids: [reports[0], reports[1]],
});
check("args: one evidence is the four-argument call", Object.keys(lib.sanctionArgs(lib.normalizeSanctionInput({ ...base, reportIds: [reports[0]] }))), ["p_resident_id", "p_report_id", "p_track", "p_reason"]);
check("no evidence refused", lib.normalizeSanctionInput({ ...base, reportIds: [] }), "evidence");
check("evidence not an array refused", lib.normalizeSanctionInput({ ...base, reportIds: reports[0] }), "evidence");
check("11 evidence refused", lib.normalizeSanctionInput({ ...base, reportIds: reports.slice(0, 11) }), "tooManyEvidence");
check("10 evidence accepted", typeof lib.normalizeSanctionInput({ ...base, reportIds: reports.slice(0, 10) }), "object");
check("duplicate evidence refused", lib.normalizeSanctionInput({ ...base, reportIds: [reports[0], reports[0]] }), "evidence");
check("non-uuid evidence refused", lib.normalizeSanctionInput({ ...base, reportIds: ["x"] }), "evidence");
check("bad resident id refused", lib.normalizeSanctionInput({ ...base, residentId: "x" }), "resident");
check("bad track refused", lib.normalizeSanctionInput({ ...base, track: "other" }), "track");
check("19-character reason refused", lib.normalizeSanctionInput({ ...base, reason: "x".repeat(19) }), "reasonShort");
check("reason is trimmed before counting", lib.normalizeSanctionInput({ ...base, reason: "  " + "x".repeat(19) + "  " }), "reasonShort");
check("20-character reason accepted", typeof lib.normalizeSanctionInput({ ...base, reason: "x".repeat(20) }), "object");
check("500-character reason accepted", typeof lib.normalizeSanctionInput({ ...base, reason: "x".repeat(500) }), "object");
check("501-character reason refused", lib.normalizeSanctionInput({ ...base, reason: "x".repeat(501) }), "reasonLong");
check("non-string reason refused", lib.normalizeSanctionInput({ ...base, reason: 12345 }), "reasonShort");
check("form: reviewProblem no evidence", form.reviewProblem(0, "x".repeat(30)), "evidence");
check("form: reviewProblem short reason", form.reviewProblem(1, "x".repeat(19)), "reasonShort");
check("form: reviewProblem ok", form.reviewProblem(1, "x".repeat(20)), null);

// --- runManualSanction: calls, and no call on bad input ----------------------
{
  const c = mockClient({ apply_manual_sanction: () => ({ data: uid(7), error: null, status: 200 }) });
  check("sanction ok", await lib.runManualSanction(c, base), { ok: true });
  check("sanction RPC args (primary + more)", c.calls[0], { name: "apply_manual_sanction", args: lib.sanctionArgs(lib.normalizeSanctionInput(base)) });
  const c2 = mockClient({});
  check("bad input makes no RPC call", [await lib.runManualSanction(c2, { ...base, reason: "short" }), c2.calls.length], [{ ok: false, reason: "reasonShort" }, 0]);
}

// --- Error mapping by SQLSTATE and message ------------------------------------
const f = (code, message, status = 400) => lib.sanctionFailure({ code, message }, status);
check("42501 role refusal", f("42501", "apply_manual_sanction: not allowed for your role"), "notAllowed");
check("42501 malicious without senior admin", f("42501", "the malicious track needs a senior barangay admin"), "notAllowed");
check("42501 yourself", f("42501", "you cannot sanction yourself"), "notAvailable");
check("42501 not visible", f("42501", "resident not found, or not visible to you"), "notAvailable");
check("22023 generic", f("22023", "track must be inaccurate or malicious"), "invalidInput");
check("22023 reason", f("22023", "a reason of 20 to 500 characters is required"), "invalidInput");
check("22023 at most 10 evidence", f("22023", "choose at most 10 evidence reports"), "tooManyEvidence");
check("55000 harsher", f("55000", "resident already has the same or a harsher active sanction"), "harsher");
check("55000 already counted", f("55000", "this report was already counted against the resident"), "alreadyCounted");
check("55000 unknown message", f("55000", "something else"), "failed");
check("unknown code", f("XX000", "boom"), "failed");
check("no HTTP answer", f("", "", 0), "unreachable");
check("401 session", f("PGRST301", "jwt", 401), "sessionExpired");
{
  const c = mockClient({ apply_manual_sanction: () => ({ data: null, error: { code: "42501", message: "secret table detail xyz" }, status: 403 }) });
  const r = await lib.runManualSanction(c, base);
  check("result carries a code, never the raw message", JSON.stringify(r).includes("secret table detail"), false);
}
{
  const sentences = {
    notAllowed: "You can't do that.",
    notAvailable: "That resident or report isn't available.",
    invalidInput: "Check the track, the evidence reports and the reason (20 to 500 characters).",
    tooManyEvidence: "Choose at most 10 evidence reports.",
    harsher: "This resident already has the same or a harsher sanction.",
    alreadyCounted: "This report already counted against the resident; choose another.",
  };
  for (const [reason, text] of Object.entries(sentences)) check(`sentence for ${reason}`, MESSAGES[form.FAILURE_KEYS[reason]].en, text);
  for (const [reason, key] of Object.entries(form.FAILURE_KEYS)) check(`message exists (en+tl) for ${reason}`, !!(MESSAGES[key]?.en && MESSAGES[key]?.tl), true);
  const residentKeys = Object.keys(MESSAGES).filter((k) => k.startsWith("resident."));
  check("every resident.* message has en and tl", residentKeys.every((k) => MESSAGES[k].en && MESSAGES[k].tl), true);
}

// --- The ladder (confirmation text only) --------------------------------------
const ladder = (track, i, m) => { const e = lib.sanctionEffect(track, { inaccurateStrikes: i, maliciousStrikes: m }); return [e.delta, e.kind, e.cooldownHours, e.liftedBy]; };
check("inaccurate 1st", ladder("inaccurate", 0, 0), [-0.05, "cooldown", 1, null]);
check("inaccurate 2nd", ladder("inaccurate", 1, 0), [-0.1, "cooldown", 24, null]);
check("inaccurate 3rd", ladder("inaccurate", 2, 0), [-0.1, "suspension", null, "barangay_admin"]);
check("inaccurate 4th+", ladder("inaccurate", 7, 0), [-0.1, "suspension", null, "barangay_admin"]);
check("malicious 1st", ladder("malicious", 0, 0), [-0.2, "cooldown", 168, null]);
check("malicious 2nd+", ladder("malicious", 0, 1), [-0.2, "suspension", null, "senior_barangay_admin"]);

// --- Rendered screens ----------------------------------------------------------
const card = lib.normalizeCard([cardRow]);
const history = reports.slice(0, 4).map((id, i) => ({
  reportId: id, createdAt: `2026-10-0${i + 1}T08:00:00Z`, category: "Noise", priorityClass: "low", priorityName: "Low", status: "resolved", outcome: i === 0 ? "confirmed-false" : null,
}));
const T = new Map(); // so `t` is the English default outside a provider
const formHtml = (props) => renderToStaticMarkup(h(form.SanctionForm, { card, history, allowMalicious: false, ...props }));

{
  const html = formHtml({});
  check("checkbox list equals exactly the history rows", (html.match(/type="checkbox"/g) ?? []).length, history.length);
  check("every history row is a checkbox value", history.every((r) => has(html, `value="${r.reportId}"`)), true);
  check("barangay_admin: no malicious option", has(html, 'value="malicious"') || has(html, "Malicious report"), false);
  check("inaccurate option present", has(html, "Inaccurate report"), true);
  check("reason textarea has a 20-500 counter", has(html, "20 to 500 characters. 0 / 500"), true);
  check("nothing is sent before the confirmation: no Apply button at first", has(html, "Apply sanction"), false);
  check("the first step is Review", has(html, "Review sanction"), true);
  check("no hidden-reports line or total", /hidden|withheld|discreet/i.test(html), false);
}
{
  const html = formHtml({ allowMalicious: true });
  check("senior admin: malicious option present", has(html, 'value="malicious"'), true);
}
{
  const big = reports.slice(0, 12).map((id) => ({ ...history[0], reportId: id }));
  const html = renderToStaticMarkup(h(form.SanctionForm, { card, history: big, allowMalicious: false, initialEvidence: reports.slice(0, 10) }));
  check("at 10 chosen the other boxes are disabled", (html.match(/disabled=""/g) ?? []).length >= 2, true);
  check("count line says 10 of 10", has(html, "10 of 10 chosen"), true);
  check("first chosen is marked Primary", has(html, "Primary"), true);
}
{
  const html = formHtml({ initialConfirming: true, initialEvidence: [reports[0], reports[1]], initialReason: "x".repeat(25) });
  check("confirmation: dialog + Apply button", [has(html, 'role="alertdialog"'), has(html, "Apply sanction")], [true, true]);
  check("confirmation: states the cooldown from the strike counts (1 strike -> 2nd = 24 h)", has(html, "24-hour cooldown") && has(html, "0.10"), true);
  check("confirmation: says the resident is notified and the action audited", has(html, "will be notified") && has(html, "audit log"), true);
  check("confirmation: says how many evidence reports", has(html, "Evidence reports: 2."), true);
  const susp = renderToStaticMarkup(h(form.SanctionForm, { card: { ...card, inaccurateStrikes: 2 }, history, allowMalicious: false, initialConfirming: true, initialEvidence: [reports[0]], initialReason: "x".repeat(25) }));
  check("confirmation: suspension on the 3rd inaccurate strike", has(susp, "suspends the resident until lifted") && has(susp, "A barangay admin can lift it."), true);
  check("the server action was never called by rendering", (globalThis.__sanctionCalls ?? []).length, 0);
}
{
  const html = renderToStaticMarkup(h(view.ResidentCardView, { card: { ...card, sanctionState: "cooldown-inaccurate", cooldownUntil: "2026-10-22T01:00:00Z" } }));
  check("card shows name, barangay, tier, score, strikes, visible count", ["Juan Dela Cruz", "Tambo", "Tier 1", "0.45", "1 inaccurate, 0 malicious"].every((x) => has(html, x)) && has(html, ">3<"), true);
  check("card shows the cooldown time", has(html, "Cooldown (inaccurate) until"), true);
  const susp = renderToStaticMarkup(h(view.ResidentCardView, { card: { ...card, sanctionState: "suspended-malicious" } }));
  check("card shows a suspension", has(susp, "Suspended (malicious) until lifted"), true);
}
{
  const html = renderToStaticMarkup(h(view.HistoryTable, { rows: history }));
  check("history table: one body row per history row", (html.match(/<tr>/g) ?? []).length - 1, history.length);
  check("history rows link back to their report", history.every((r) => has(html, `/queue?report=${r.reportId}`)), true);
  check("history table adds no count, total or placeholder", /hidden|withheld|discreet|total/i.test(html), false);
  check("empty history says so, nothing more", has(renderToStaticMarkup(h(view.HistoryTable, { rows: [] })), "No reports to show."), true);
}

// --- Page and drawer wiring (source checks) -------------------------------------
{
  const page = read("app/residents/[id]/page.tsx");
  check("page: gate runs first", page.indexOf("requireBarangayOfficial()") < page.indexOf("loadResidentCard(supabase"), true);
  check("page: desk officer -> not-authorized", /barangay_official[\s\S]*redirect\("\/not-authorized"\)/.test(page), true);
  check("page: malformed id -> 404", /isUuid\(params\.id\)\)\s*notFound\(\)/.test(page), true);
  check("page: zero card rows -> 404", /!card\.card\)\s*notFound\(\)/.test(page), true);
  const panel = read("components/queue/ReportDetailPanel.tsx");
  check("drawer: the link calls findResidentLink only when offered", /if \(!offerResidentProfile\) return;[\s\S]*findResidentLink\(report\.id\)/.test(panel), true);
  check("drawer: link renders only once the backend returned a path", /\{residentLink && \(/.test(panel), true);
  const queue = read("app/queue/QueueClient.tsx");
  check("queue: only admin roles offer the link", has(queue, "offerResidentProfile={canViewResidentProfile(official.role)}"), true);
  const action = read("app/actions/residentProfile.ts");
  check("action: no service-role key anywhere", /service_role|SERVICE_ROLE/.test(action + read("lib/residentProfile.ts")), false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
