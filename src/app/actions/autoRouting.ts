"use server";

import { createClient } from "@/lib/supabase/server";
import {
  AUTO_ROUTING_SET_RPC,
  autoRoutingErrorKey,
  parseSetResult,
  type SetAutoRoutingOutcome,
} from "@/lib/autoRouting";

/**
 * Switches automatic routing (CARD) ON or OFF (set_auto_routing_enabled, see
 * src/lib/autoRouting.ts). A public POST endpoint like every action here, so
 * the input is proven first: a real boolean. The database decides the rest:
 * only a municipal_admin may, and every real flip is audited there with the
 * administrator as actor. The console writes no audit row of its own.
 *
 * The answer is the state the database reports back, or an error key the page
 * words in the official's language. The backend's message never reaches the
 * browser.
 */
export async function setAutoRouting(enabled: boolean): Promise<SetAutoRoutingOutcome> {
  if (typeof enabled !== "boolean") return { ok: false, errorKey: "autoRouting.err.enabledRequired" };

  const supabase = createClient();
  const { data, error } = await supabase.rpc(AUTO_ROUTING_SET_RPC, { p_enabled: enabled });
  if (error) {
    console.error("[auto-routing] switch failed", error.code, error.details);
    return { ok: false, errorKey: autoRoutingErrorKey(error) };
  }

  const state = parseSetResult(data);
  if (!state) {
    console.error("[auto-routing] unexpected answer from the switch");
    return { ok: false, errorKey: "autoRouting.err.generic" };
  }
  return { ok: true, state };
}
