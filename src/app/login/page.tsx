import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

// Reads the session cookie, so this page can no longer be prerendered.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // A signed-in user has no business on the OTP form. Send them to the
  // console, whose own gate decides between /queue and /not-authorized —
  // that page is where a wrong-role account can actually sign out.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/queue");

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
