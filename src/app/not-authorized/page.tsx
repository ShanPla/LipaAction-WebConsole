import Link from "next/link";

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
        <Link href="/login" className="text-xs font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
