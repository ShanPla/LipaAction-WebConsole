import { signOut } from "@/app/actions/auth";

// Sign-out is the only sensible exit here. The previous [Back to sign in]
// link left the session cookie in place, so an account with the wrong role
// (an agency user, say) looped /login → /queue → /not-authorized with no way
// to clear it from the UI: /login now bounces a signed-in user straight back
// to /queue.
export default function NotAuthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm rounded-card border border-ink-100 bg-white p-6 text-center shadow-panel">
        <p className="mb-1 text-sm font-semibold text-ink-900">Not authorized</p>
        <p className="mb-4 text-xs text-ink-500">
          Your account doesn&apos;t have access to the Barangay Web Console. This console is
          for barangay officials only — if you believe this is a mistake, contact your Punong
          Barangay or the LipaAction pilot support desk.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center text-xs font-medium text-brand-600 hover:underline"
          >
            Sign out and use a different account
          </button>
        </form>
      </div>
    </div>
  );
}
