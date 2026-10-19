import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  AUTO_ROUTING_GET_RPC,
  UNKNOWN_AUTO_ROUTING,
  parseAutoRoutingState,
  type AutoRoutingState,
} from "@/lib/autoRouting";

/**
 * The automatic-routing (CARD) switch as the signed-in user may read it
 * (get_auto_routing_state, see src/lib/autoRouting.ts). Fails closed: a
 * failed read is the unknown state, which the screen shows as [unknown] and
 * never as OFF.
 */
export async function getAutoRoutingState(): Promise<AutoRoutingState> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(AUTO_ROUTING_GET_RPC);
  if (error) {
    console.error("[auto-routing] state read failed", error.code, error.message);
    return UNKNOWN_AUTO_ROUTING;
  }
  return parseAutoRoutingState(data);
}
