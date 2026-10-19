/**
 * The city dashboard's automatic-routing (CARD) switch. Pure, with no runtime
 * imports, so `npm run check:autorouting` (scripts/check-auto-routing.mjs)
 * can load it in plain Node.
 *
 * The backend decides everything. Two RPCs from LipaAction's migration
 * 20261209130000_card_on_by_default.sql, both SECURITY INVOKER with EXECUTE
 * for authenticated only:
 *
 *   get_auto_routing_state()  -> { enabled, updated_at, updated_by, policy }
 *     any signed-in user. `enabled` is null (never false) when the caller
 *     cannot read the auto_route_enabled row, so a console never shows OFF
 *     for a switch it cannot see.
 *   set_auto_routing_enabled(p_enabled boolean)
 *     -> { enabled, changed, previous, updated_at, updated_by }
 *     municipal_admin only. Errors: 42501 / details not_authenticated or
 *     not_authorized, 22023 / enabled_required, 55000 / switch_missing.
 *     Every real flip is audited server-side (routing_threshold_changed,
 *     with the administrator as actor); a call for the state already in
 *     force changes and audits nothing.
 *
 * The switch controls automatic routing only. The Critical escalation timer
 * and CDRRMO dispatch are separate and unaffected by it.
 */

export const AUTO_ROUTING_GET_RPC = "get_auto_routing_state";
export const AUTO_ROUTING_SET_RPC = "set_auto_routing_enabled";

/** The role the database lets flip the switch; the screen offers it to no other. */
export const AUTO_ROUTING_ADMIN_ROLE = "municipal_admin";

export function mayControlAutoRouting(role: string | null | undefined): boolean {
  return role === AUTO_ROUTING_ADMIN_ROLE;
}

// ---------------------------------------------------------------------------
// State.

export interface AutoRoutingState {
  // null: the caller could not read the row, or the read failed. Shown as
  // [unknown] and the switch stays off limits; never shown as OFF.
  enabled: boolean | null;
  // ISO instant of the last change, or null.
  updatedAt: string | null;
}

export const UNKNOWN_AUTO_ROUTING: AutoRoutingState = { enabled: null, updatedAt: null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
}

/**
 * get_auto_routing_state()'s answer as a state. Anything that is not an object
 * is the unknown state; `enabled` is kept only when it is a real boolean, so a
 * malformed answer can never read as OFF.
 */
export function parseAutoRoutingState(data: unknown): AutoRoutingState {
  if (!isRecord(data)) return UNKNOWN_AUTO_ROUTING;
  return {
    enabled: typeof data.enabled === "boolean" ? data.enabled : null,
    updatedAt: isoOrNull(data.updated_at),
  };
}

/**
 * set_auto_routing_enabled()'s answer, or null when it is not the documented
 * shape. The caller then reports a generic failure rather than guessing which
 * way the switch ended up.
 */
export function parseSetResult(data: unknown): AutoRoutingState | null {
  if (!isRecord(data) || typeof data.enabled !== "boolean") return null;
  return { enabled: data.enabled, updatedAt: isoOrNull(data.updated_at) };
}

// ---------------------------------------------------------------------------
// Errors.

export type AutoRoutingErrorKey =
  | "autoRouting.err.notAuthenticated"
  | "autoRouting.err.notAuthorized"
  | "autoRouting.err.enabledRequired"
  | "autoRouting.err.switchMissing"
  | "autoRouting.err.generic";

interface RpcErrorLike {
  code?: string | null;
  details?: string | null;
}

/**
 * Maps the RPC's error to a message key. The code and the DETAIL token decide,
 * never the message text. 42501 without one of the two tokens (for instance a
 * row-level-security refusal) is the generic message, as is anything else.
 */
export function autoRoutingErrorKey(error: RpcErrorLike | null | undefined): AutoRoutingErrorKey {
  const code = error?.code;
  const details = typeof error?.details === "string" ? error.details.trim() : "";
  if (code === "42501" && details === "not_authenticated") return "autoRouting.err.notAuthenticated";
  if (code === "42501" && details === "not_authorized") return "autoRouting.err.notAuthorized";
  if (code === "22023" && details === "enabled_required") return "autoRouting.err.enabledRequired";
  if (code === "55000" && details === "switch_missing") return "autoRouting.err.switchMissing";
  return "autoRouting.err.generic";
}

/** What the server action answers; the page words it in the official's language. */
export type SetAutoRoutingOutcome =
  | { ok: true; state: AutoRoutingState }
  | { ok: false; errorKey: AutoRoutingErrorKey };

// ---------------------------------------------------------------------------
// The control's behavior, as a pure state machine. The component is a thin
// shell: it feeds events in and performs the one effect this returns.

export interface SwitchState {
  enabled: boolean | null;
  updatedAt: string | null;
  // The turn-ON confirmation dialog is open.
  confirming: boolean;
  // A write is in flight.
  busy: boolean;
  errorKey: AutoRoutingErrorKey | null;
  // The answer of the last write that succeeded, kept so the screen can say
  // what the server reported ("now ON") and not only show the switch.
  lastSaved: boolean | null;
}

export type SwitchEvent =
  | { type: "press"; target: boolean }
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "saved"; state: AutoRoutingState }
  | { type: "failed"; errorKey: AutoRoutingErrorKey };

export type SwitchEffect = { type: "write"; enabled: boolean } | null;

export function initialSwitchState(initial: AutoRoutingState): SwitchState {
  return {
    enabled: initial.enabled,
    updatedAt: initial.updatedAt,
    confirming: false,
    busy: false,
    errorKey: null,
    lastSaved: null,
  };
}

/**
 * Turning automatic routing ON asks first: it hands routing of eligible
 * reports to the system with no desk in the loop. Turning it OFF never does;
 * that is the safe direction and the one to reach fast.
 */
export function needsConfirmation(target: boolean): boolean {
  return target === true;
}

export function stepSwitch(state: SwitchState, event: SwitchEvent): { state: SwitchState; effect: SwitchEffect } {
  switch (event.type) {
    case "press": {
      // Nothing while a write runs, while the state is unknown, or when the
      // press would not change anything.
      if (state.busy || state.enabled === null || event.target === state.enabled) {
        return { state, effect: null };
      }
      if (needsConfirmation(event.target)) {
        return { state: { ...state, confirming: true, errorKey: null }, effect: null };
      }
      return {
        state: { ...state, confirming: false, busy: true, errorKey: null },
        effect: { type: "write", enabled: event.target },
      };
    }
    case "confirm": {
      if (!state.confirming || state.busy) return { state, effect: null };
      return {
        state: { ...state, confirming: false, busy: true, errorKey: null },
        effect: { type: "write", enabled: true },
      };
    }
    case "cancel": {
      if (state.busy) return { state, effect: null };
      return { state: { ...state, confirming: false }, effect: null };
    }
    case "saved": {
      return {
        state: {
          ...state,
          enabled: event.state.enabled,
          updatedAt: event.state.updatedAt,
          confirming: false,
          busy: false,
          errorKey: null,
          lastSaved: event.state.enabled,
        },
        effect: null,
      };
    }
    case "failed": {
      return {
        state: { ...state, confirming: false, busy: false, errorKey: event.errorKey, lastSaved: null },
        effect: null,
      };
    }
  }
}
