"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Toggle } from "@/components/settings/NotificationsSection";
import { useT } from "@/lib/i18n";
import { manilaDateTime } from "@/lib/utils";
import {
  initialSwitchState,
  mayControlAutoRouting,
  stepSwitch,
  type AutoRoutingState,
  type SetAutoRoutingOutcome,
  type SwitchEvent,
  type SwitchState,
} from "@/lib/autoRouting";

/**
 * The municipal administrator's automatic-routing (CARD) switch. The role
 * check here only decides whether the screen offers the control; the database
 * refuses anyone else (set_auto_routing_enabled). Turning it ON asks first,
 * turning it OFF does not (see src/lib/autoRouting.ts).
 *
 * `save` is the setAutoRouting server action, passed in by the page so this
 * component stays free of server imports.
 */
export function AutoRoutingSwitch({
  role,
  initial,
  save,
}: {
  role: string;
  initial: AutoRoutingState;
  save: (enabled: boolean) => Promise<SetAutoRoutingOutcome>;
}) {
  const [state, setState] = useState<SwitchState>(() => initialSwitchState(initial));

  // Hidden entirely for any other role.
  if (!mayControlAutoRouting(role)) return null;

  function dispatch(event: SwitchEvent) {
    const next = stepSwitch(state, event);
    setState(next.state);
    const effect = next.effect;
    if (effect?.type === "write") {
      void run(effect.enabled);
    }
  }

  async function run(enabled: boolean) {
    let outcome: SetAutoRoutingOutcome;
    try {
      outcome = await save(enabled);
    } catch (error) {
      // The POST never answered; the write may or may not have landed, so
      // say so and leave the switch as it was shown.
      console.error("[auto-routing] no answer", error);
      outcome = { ok: false, errorKey: "autoRouting.err.generic" };
    }
    setState((current) =>
      outcome.ok
        ? stepSwitch(current, { type: "saved", state: outcome.state }).state
        : stepSwitch(current, { type: "failed", errorKey: outcome.errorKey }).state
    );
  }

  return (
    <AutoRoutingSwitchView
      state={state}
      onPress={(target) => dispatch({ type: "press", target })}
      onConfirm={() => dispatch({ type: "confirm" })}
      onCancel={() => dispatch({ type: "cancel" })}
    />
  );
}

/** The card itself, from a state alone, so every state can be rendered. */
export function AutoRoutingSwitchView({
  state,
  onPress,
  onConfirm,
  onCancel,
}: {
  state: SwitchState;
  onPress: (target: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const { enabled, updatedAt, confirming, busy, errorKey, lastSaved } = state;
  const unknown = enabled === null;

  return (
    <section
      aria-labelledby="auto-routing-title"
      className="mb-4 rounded-card border border-ink-100 bg-white p-5 shadow-panel print:hidden"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="auto-routing-title" className="text-sm font-semibold text-ink-900">
            {t("autoRouting.title")}
          </h2>
          <p className="mt-1 text-xs text-ink-500">{t("autoRouting.help")}</p>
        </div>
        <Toggle
          label={t("autoRouting.switchLabel")}
          checked={enabled === true}
          disabled={unknown || busy}
          onChange={onPress}
        />
      </div>

      <p className="mt-3 text-sm text-ink-900">
        <span data-testid="auto-routing-status" className="font-semibold">
          {enabled === true
            ? t("autoRouting.statusOn")
            : enabled === false
              ? t("autoRouting.statusOff")
              : t("autoRouting.statusUnknown")}
        </span>
        {updatedAt && (
          <span className="ml-2 text-xs text-ink-500">
            {t("autoRouting.updated", { when: manilaDateTime(updatedAt) })}
          </span>
        )}
      </p>
      {unknown && <p className="mt-1 text-xs text-ink-500">{t("autoRouting.unknownBody")}</p>}

      {lastSaved !== null && !errorKey && (
        <p role="status" className="mt-2 text-xs font-medium text-brand-700">
          {lastSaved ? t("autoRouting.savedOn") : t("autoRouting.savedOff")}
        </p>
      )}
      {errorKey && (
        <p role="alert" className="mt-2 text-xs font-medium text-priority-critical">
          {t(errorKey)}
        </p>
      )}

      {confirming && (
        <ConfirmModal
          title={t("autoRouting.confirmTitle")}
          description={t("autoRouting.confirmBody")}
          confirmLabel={t("autoRouting.confirmOn")}
          busy={busy}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
    </section>
  );
}
