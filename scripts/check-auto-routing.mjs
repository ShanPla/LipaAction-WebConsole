// Self-check for the city dashboard's automatic-routing (CARD) switch:
// src/lib/autoRouting.ts (state parsing, error mapping, the confirm-before-ON
// state machine), its en/tl messages, and the real AutoRoutingSwitch component
// rendered to HTML in each state. No database, no browser, no test framework.
//
//   npm run check:autorouting
//
// Needs Node >= 22.18, which strips the .ts types on import. The .tsx files
// and the "@/" alias are handled by a small loader registered below, which
// compiles with the repo's own TypeScript. Exits 1 if any check fails.

import { register } from "node:module";

const rootUrl = new URL("../", import.meta.url).href;

const hooks = `
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const ROOT = ${JSON.stringify(rootUrl)};
const ts = createRequire(ROOT + "package.json")("typescript");
export async function resolve(specifier, context, next) {
  const relative = specifier.startsWith("./") || specifier.startsWith("../");
  if (specifier.startsWith("@/") || (relative && context.parentURL?.startsWith(ROOT) && !/\.\w+$/.test(specifier))) {
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

const src = (p) => new URL(`../src/${p}`, import.meta.url).href;
const lib = await import(src("lib/autoRouting.ts"));
const { MESSAGES } = await import(src("lib/messages.ts"));
const { AutoRoutingSwitch, AutoRoutingSwitchView } = await import(src("components/city/AutoRoutingSwitch.tsx"));
const { createElement: h } = await import("react");
const { renderToStaticMarkup } = (await import("react-dom/server")).default;
const { readFileSync } = await import("node:fs");

const {
  AUTO_ROUTING_GET_RPC,
  AUTO_ROUTING_SET_RPC,
  mayControlAutoRouting,
  parseAutoRoutingState,
  parseSetResult,
  autoRoutingErrorKey,
  needsConfirmation,
  initialSwitchState,
  stepSwitch,
  UNKNOWN_AUTO_ROUTING,
} = lib;

// The code logs unexpected answers on purpose; keep the run output clean.
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

// --- Contract names (pinned to 20261209130000_card_on_by_default.sql) ------
check("get rpc name", AUTO_ROUTING_GET_RPC, "get_auto_routing_state");
check("set rpc name", AUTO_ROUTING_SET_RPC, "set_auto_routing_enabled");

// --- Who is offered the control ----------------------------------------------
check("role: municipal_admin", mayControlAutoRouting("municipal_admin"), true);
for (const role of ["barangay_official", "barangay_admin", "senior_barangay_admin", "", null, undefined]) {
  check(`role: ${role === "" ? "empty" : role} is refused`, mayControlAutoRouting(role), false);
}

// --- State parsing -----------------------------------------------------------
const AT = "2026-10-19T02:30:00+00:00";
check("state: on", parseAutoRoutingState({ enabled: true, updated_at: AT, updated_by: "u", policy: {} }), { enabled: true, updatedAt: AT });
check("state: off", parseAutoRoutingState({ enabled: false, updated_at: AT }), { enabled: false, updatedAt: AT });
check("state: null enabled stays unknown, never off", parseAutoRoutingState({ enabled: null, updated_at: null }), { enabled: null, updatedAt: null });
check("state: string enabled is unknown", parseAutoRoutingState({ enabled: "true" }), { enabled: null, updatedAt: null });
check("state: 0 is unknown", parseAutoRoutingState({ enabled: 0 }), { enabled: null, updatedAt: null });
check("state: bad date dropped", parseAutoRoutingState({ enabled: true, updated_at: "not a date" }), { enabled: true, updatedAt: null });
check("state: empty date dropped", parseAutoRoutingState({ enabled: true, updated_at: "" }), { enabled: true, updatedAt: null });
for (const [name, bad] of [["null", null], ["undefined", undefined], ["string", "x"], ["array", []], ["number", 1]]) {
  check(`state: ${name} is unknown`, parseAutoRoutingState(bad), UNKNOWN_AUTO_ROUTING);
}

// --- set result parsing ------------------------------------------------------
check("set: on", parseSetResult({ enabled: true, changed: true, previous: false, updated_at: AT, updated_by: "u" }), { enabled: true, updatedAt: AT });
check("set: unchanged off", parseSetResult({ enabled: false, changed: false, previous: false, updated_at: AT }), { enabled: false, updatedAt: AT });
check("set: missing enabled is rejected", parseSetResult({ changed: true }), null);
check("set: non-boolean enabled is rejected", parseSetResult({ enabled: "true" }), null);
check("set: null is rejected", parseSetResult(null), null);
check("set: array is rejected", parseSetResult([]), null);

// --- Error mapping -----------------------------------------------------------
const key = (code, details) => autoRoutingErrorKey({ code, details });
check("err: 42501 not_authenticated", key("42501", "not_authenticated"), "autoRouting.err.notAuthenticated");
check("err: 42501 not_authorized", key("42501", "not_authorized"), "autoRouting.err.notAuthorized");
check("err: 22023 enabled_required", key("22023", "enabled_required"), "autoRouting.err.enabledRequired");
check("err: 55000 switch_missing", key("55000", "switch_missing"), "autoRouting.err.switchMissing");
check("err: 42501 without a token (an RLS refusal) is generic", key("42501", null), "autoRouting.err.generic");
check("err: 42501 other token is generic", key("42501", "something_else"), "autoRouting.err.generic");
check("err: 22023 wrong token is generic", key("22023", "not_authorized"), "autoRouting.err.generic");
check("err: 55000 wrong token is generic", key("55000", "enabled_required"), "autoRouting.err.generic");
check("err: wrong code with a right token is generic", key("XX000", "not_authorized"), "autoRouting.err.generic");
check("err: PGRST202 is generic", key("PGRST202", null), "autoRouting.err.generic");
check("err: null is generic", autoRoutingErrorKey(null), "autoRouting.err.generic");
check("err: undefined is generic", autoRoutingErrorKey(undefined), "autoRouting.err.generic");
check("err: token with spaces still matches", key("42501", " not_authorized "), "autoRouting.err.notAuthorized");
check("err: the message text is never read", autoRoutingErrorKey({ code: "42501", message: "not_authorized", details: null }), "autoRouting.err.generic");

// --- The state machine: confirm before ON, none for OFF ---------------------
check("confirm needed to turn on", needsConfirmation(true), true);
check("no confirm needed to turn off", needsConfirmation(false), false);

const off = initialSwitchState({ enabled: false, updatedAt: AT });
const on = initialSwitchState({ enabled: true, updatedAt: AT });

let r = stepSwitch(off, { type: "press", target: true });
check("press ON: asks first, writes nothing", [r.state.confirming, r.state.busy, r.effect], [true, false, null]);
r = stepSwitch(r.state, { type: "cancel" });
check("cancel: closes, writes nothing, still OFF", [r.state.confirming, r.state.busy, r.state.enabled, r.effect], [false, false, false, null]);
r = stepSwitch(stepSwitch(off, { type: "press", target: true }).state, { type: "confirm" });
check("confirm: writes true", [r.state.confirming, r.state.busy, r.effect], [false, true, { type: "write", enabled: true }]);
r = stepSwitch(on, { type: "press", target: false });
check("press OFF: writes false at once, no dialog", [r.state.confirming, r.state.busy, r.effect], [false, true, { type: "write", enabled: false }]);
check("confirm with no dialog open does nothing", stepSwitch(off, { type: "confirm" }).effect, null);
check("press while busy does nothing", stepSwitch(stepSwitch(on, { type: "press", target: false }).state, { type: "press", target: true }).effect, null);
check("press while unknown does nothing", stepSwitch(initialSwitchState(UNKNOWN_AUTO_ROUTING), { type: "press", target: true }).effect, null);
check("press for the state already shown does nothing", stepSwitch(on, { type: "press", target: true }).effect, null);
check("cancel while busy is ignored", stepSwitch(stepSwitch(on, { type: "press", target: false }).state, { type: "cancel" }).state.busy, true);

const AT2 = "2026-10-19T03:00:00+00:00";
r = stepSwitch(stepSwitch(off, { type: "press", target: true }).state, { type: "confirm" });
r = stepSwitch(r.state, { type: "saved", state: { enabled: true, updatedAt: AT2 } });
check("saved: shows the returned value and time", [r.state.enabled, r.state.updatedAt, r.state.busy, r.state.lastSaved, r.state.errorKey], [true, AT2, false, true, null]);
r = stepSwitch(stepSwitch(off, { type: "press", target: true }).state, { type: "confirm" });
r = stepSwitch(r.state, { type: "saved", state: { enabled: false, updatedAt: AT2 } });
check("saved: the returned value wins over the one asked for", [r.state.enabled, r.state.lastSaved], [false, false]);
r = stepSwitch(stepSwitch(on, { type: "press", target: false }).state, { type: "failed", errorKey: "autoRouting.err.notAuthorized" });
check("failed: keeps the shown state, shows the error", [r.state.enabled, r.state.busy, r.state.errorKey, r.state.lastSaved], [true, false, "autoRouting.err.notAuthorized", null]);
r = stepSwitch(r.state, { type: "press", target: false });
check("a new press clears the old error", r.state.errorKey, null);

// --- Messages ---------------------------------------------------------------
const keys = Object.keys(MESSAGES).filter((k) => k.startsWith("autoRouting."));
check("message keys present", keys.length, 18);
const placeholders = (s) => (s.match(/\{\w+\}/g) ?? []).sort();
for (const k of keys) {
  const { en, tl } = MESSAGES[k];
  check(`message ${k}: en and tl filled`, [en.trim() !== "", tl.trim() !== ""], [true, true]);
  check(`message ${k}: placeholders match`, placeholders(en), placeholders(tl));
}
for (const k of ["autoRouting.err.notAuthenticated", "autoRouting.err.notAuthorized", "autoRouting.err.enabledRequired", "autoRouting.err.switchMissing", "autoRouting.err.generic"]) {
  check(`error key exists: ${k}`, k in MESSAGES, true);
}
const help = MESSAGES["autoRouting.help"];
for (const lang of ["en", "tl"]) {
  check(`help (${lang}) names the Critical timer`, /Critical/.test(help[lang]), true);
  check(`help (${lang}) names CDRRMO dispatch`, /CDRRMO/.test(help[lang]), true);
  check(`help (${lang}) says changes are audited`, /audit/i.test(help[lang]), true);
}
check("help (en) says separate and unaffected", /separate/.test(help.en) && /not affected/.test(help.en), true);

// --- The component, rendered ------------------------------------------------
const noop = () => {};
const view = (state) => renderToStaticMarkup(h(AutoRoutingSwitchView, { state, onPress: noop, onConfirm: noop, onCancel: noop }));
const attr = (html, name) => (html.match(new RegExp(`${name}="([^"]*)"`)) ?? [])[1];
const switchDisabled = (html) => /<button[^>]*role="switch"[^>]*disabled=""/.test(html) || /<button[^>]*disabled=""[^>]*role="switch"/.test(html);

const saveNever = async () => ({ ok: true, state: { enabled: true, updatedAt: AT } });
const mount = (role, initial) => renderToStaticMarkup(h(AutoRoutingSwitch, { role, initial, save: saveNever }));
check("hidden for barangay_official", mount("barangay_official", { enabled: true, updatedAt: AT }), "");
check("hidden for barangay_admin", mount("barangay_admin", { enabled: true, updatedAt: AT }), "");
check("hidden for senior_barangay_admin", mount("senior_barangay_admin", { enabled: true, updatedAt: AT }), "");
check("hidden for an empty role", mount("", { enabled: true, updatedAt: AT }), "");
const shown = mount("municipal_admin", { enabled: true, updatedAt: AT });
check("shown for municipal_admin: a switch", has(shown, 'role="switch"'), true);

const htmlOn = view(on);
check("on: aria-checked true", attr(htmlOn, "aria-checked"), "true");
check("on: status says ON", has(htmlOn, ">ON<"), true);
check("on: no dialog", has(htmlOn, 'role="dialog"'), false);
check("on: help names Critical timer and CDRRMO dispatch", has(htmlOn, "Critical escalation timer") && has(htmlOn, "CDRRMO dispatch"), true);
check("on: updated time is shown in Manila time", has(htmlOn, "Oct 19, 2026, 10:30") && has(htmlOn, "Asia/Manila"), true);
check("on: switch is labelled", has(htmlOn, 'aria-label="Automatic routing"'), true);
check("on: switch is at least 44px tall", has(htmlOn, "h-11"), true);

const htmlOff = view(off);
check("off: aria-checked false", attr(htmlOff, "aria-checked"), "false");
check("off: status says OFF", has(htmlOff, ">OFF<"), true);

const htmlConfirm = view(stepSwitch(off, { type: "press", target: true }).state);
check("confirming: dialog shown", has(htmlConfirm, 'role="dialog"') && has(htmlConfirm, 'aria-modal="true"'), true);
check("confirming: asks to turn ON", has(htmlConfirm, "Turn automatic routing ON?"), true);
check("confirming: Cancel and Turn ON offered", has(htmlConfirm, ">Cancel<") && has(htmlConfirm, ">Turn ON<"), true);
check("not confirming: no dialog after cancel", has(view(stepSwitch(stepSwitch(off, { type: "press", target: true }).state, { type: "cancel" }).state), 'role="dialog"'), false);

check("busy: switch disabled", switchDisabled(view({ ...off, busy: true })), true);
check("idle: switch enabled", switchDisabled(htmlOff), false);

const htmlSaved = view(stepSwitch({ ...off, busy: true }, { type: "saved", state: { enabled: true, updatedAt: AT } }).state);
check("saved: returned value shown (ON, aria-checked true)", [has(htmlSaved, ">ON<"), attr(htmlSaved, "aria-checked")], [true, "true"]);
check("saved: status line says now ON", has(htmlSaved, 'role="status"') && has(htmlSaved, "Automatic routing is now ON."), true);
const htmlSavedOff = view(stepSwitch({ ...on, busy: true }, { type: "saved", state: { enabled: false, updatedAt: AT } }).state);
check("saved off: status line says now OFF", has(htmlSavedOff, "Automatic routing is now OFF."), true);

const errText = {
  "autoRouting.err.notAuthenticated": "You are signed out.",
  "autoRouting.err.notAuthorized": "Only the municipal administrator can change automatic routing.",
  "autoRouting.err.enabledRequired": "The switch needs a clear ON or OFF.",
  "autoRouting.err.switchMissing": "The automatic routing setting is missing in the database.",
  "autoRouting.err.generic": "Check the state shown here before trying again.",
};
for (const [errorKey, text] of Object.entries(errText)) {
  const html = view(stepSwitch({ ...on, busy: true }, { type: "failed", errorKey }).state);
  check(`error shown: ${errorKey}`, has(html, 'role="alert"') && has(html, text), true);
}
check("error: the shown state is kept", has(view(stepSwitch({ ...on, busy: true }, { type: "failed", errorKey: "autoRouting.err.generic" }).state), ">ON<"), true);

const htmlUnknown = view(initialSwitchState(UNKNOWN_AUTO_ROUTING));
check("unknown: says Unknown, not OFF", has(htmlUnknown, ">Unknown<") && !has(htmlUnknown, ">OFF<"), true);
check("unknown: switch disabled", switchDisabled(htmlUnknown), true);

// --- Wiring (the shell around the pure parts) -------------------------------
const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const action = read("app/actions/autoRouting.ts");
check("action: calls the set rpc with p_enabled", /rpc\(AUTO_ROUTING_SET_RPC, \{ p_enabled: enabled \}\)/.test(action), true);
check("action: refuses a non-boolean", /typeof enabled !== "boolean"/.test(action), true);
check("action: does not return the backend message", !/error\.message/.test(action), true);
check("loader: calls the get rpc", /rpc\(AUTO_ROUTING_GET_RPC\)/.test(read("lib/data/autoRouting.ts")), true);
check("page: reads the state on the server", /getAutoRoutingState\(\)/.test(read("app/city/page.tsx")), true);
check("overview: mounts the switch with the action", /<AutoRoutingSwitch role=\{admin\.role\} initial=\{autoRouting\} save=\{setAutoRouting\} \/>/.test(read("app/city/CityOverviewClient.tsx")), true);
check("component: never uses window.confirm", !/window\.confirm|\bconfirm\(/.test(read("components/city/AutoRoutingSwitch.tsx")), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
