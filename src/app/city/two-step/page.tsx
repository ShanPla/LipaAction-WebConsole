import { redirect } from "next/navigation";
import { requireCitySignIn } from "@/lib/auth";
import { TwoStepForm } from "./TwoStepForm";

// This page depends on the signed-in user's session — never statically prerender it.
export const dynamic = "force-dynamic";

/**
 * Where a city account's sign-in is finished: the authenticator-app step,
 * and its one-time set-up. The one city page that doesn't require the step
 * it exists to ask for; a barangay account never reaches it.
 */
export default async function TwoStepPage() {
  const { admin, secondStepDone, hasAuthenticator } = await requireCitySignIn();
  // Nothing to ask of a session that has already passed.
  if (secondStepDone) redirect("/city");
  return <TwoStepForm email={admin.email} hasAuthenticator={hasAuthenticator} />;
}
