# LipaAction — Barangay Web Console

The officials-facing web console for the LipaAction incident-reporting system, as
specified in **Chapter 3, Section 3.7.3** of the LipaAction thesis (Major Revision,
May 2026). Barangay officials use it to review, validate, and reject incident reports
submitted by residents through the LipaAction mobile app.

This is a working implementation against the project's shared Supabase backend — not
a static mockup. Sign-in is real, report data is real, and validating or rejecting a
report writes to the production database through the same review path the rest of the
system uses.

## Tech stack

Follows the stack specified in Chapter 3, Section 3.8.3 (Technology Stack) for the
officials' web dashboards. Tailwind CSS was added for styling, since the thesis text
does not specify a CSS framework.

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres, Auth, Row Level Security) via `@supabase/ssr`

There is no test suite. Verification is `npx tsc --noEmit`, `npm run lint`, and
`npm run build`.

## Getting started

```bash
npm install
```

Create `.env.local` in the project root with the Supabase project URL and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Only the public anon key is used. Every read and write runs as the signed-in official
under Row Level Security; the service-role key is never needed and must not be added.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It redirects to `/login`, and
after sign-in to `/queue`.

## Signing in

Login is passwordless. An official enters their email, receives a one-time code, and
types it back into the same tab. Clicking the link in the email works as a fallback.

Only pre-provisioned accounts can sign in — the login form is configured with
`shouldCreateUser: false`, so an unknown email address does not create an account.
Accounts are created by an administrator in Supabase.

Every page checks the signed-in user's profile role on the server before rendering.
Only `barangay_official`, `barangay_admin`, and `senior_barangay_admin` are admitted;
any other role is redirected to `/not-authorized`. The signed-in official's name,
role, and barangay are shown throughout the interface.

## Pages

| Page | Status |
|------|--------|
| **Queue** | Live. Shows the barangay's pending reports in four tabs — Emergency Fast-triage, Standard intake, Flagged duplicates, Recent validated. Validate and Reject write to the database; rejection requires a reason. A duplicate cluster can be validated as one action. |
| **Cluster Explorer** | Live. Groups pending reports that share a `cluster_id`, the output of the duplicate-flagging algorithm. |
| **Validation History** | Live. Reviewed reports (validated or rejected) with the reviewing official, timestamp, rejection reason, and outcome filters. Exports the visible rows to CSV. |
| **Settings** | Profile is live (name, role, barangay, email, phone); the display name is editable. Language and notification preferences are interface-only. |
| **Audit Log** | Placeholder data. Blocked on the backend: no barangay role currently has read access to the audit table, and the audit write path is not yet populated. |

All report data is scoped to the signed-in official's own barangay by Row Level
Security in the database. The application does not, and cannot, widen that scope.

## Privacy

Officials never see a reporter's name, whether or not the resident chose to withhold
their identity. The interface shows only "Verified reporter" or "Identity withheld".
This is deliberate — the system exposes no reporter-name field to officials at all —
and it applies to every page, the CSV export included.

## Folder structure

```
src/
  app/
    login/                    Two-step email + code sign-in
    auth/callback/            Magic-link fallback handler
    not-authorized/
    actions/                  Server Actions: report review, profile update, sign-out
    queue/
    cluster-explorer/
    validation-history/
    audit-log/
    settings/
      page.tsx                Server component: auth gate + data fetch
      <Name>Client.tsx        Client component: the page UI
  components/
    layout/                   Sidebar, TopBar, AppShell, ProfileMenu
    ui/                       Badge, Button, Tile, ReporterChip, Toast, modals
    queue/                    Queue-specific components
    cluster-explorer/
    validation-history/
    audit-log/
    settings/
  lib/
    auth.ts                   requireBarangayOfficial() — the per-page auth gate
    supabase/                 Server and browser Supabase clients
    data/                     Server-only data access, one module per live page
    utils.ts
  data/                       Remaining placeholder fixtures (Audit Log, preferences)
  types/                      Shared TypeScript interfaces
```

Each gated route is a pair: a server `page.tsx` that verifies the session and fetches
data, and a client component that renders it. Data access lives in `src/lib/data/`
and is marked `server-only`.

## Known limitations

These are gaps in the data available to the console, not unfinished interface work.
In each case the console shows nothing rather than an approximation.

- **Audit Log** is on placeholder data until the backend grants barangay roles read
  access to audit events and populates the audit trail.
- **Cluster geodata.** There is no dedicated clusters table, so the Cluster Explorer
  has no real centroid or radius to show, and no per-report proximity signals. The
  spatial panel says so rather than displaying invented figures.
- **Manual report intake and cluster splitting** are not offered. Neither is
  permitted by the current database policies.
- **Report addresses.** Reports carry a geographic point, not an address string, so
  no location text is displayed.
- **Validation History** shows the 50 most recent reviewed reports. Filters apply to
  those rows.

## Notes on fidelity to the thesis mockups

- Colors, badges, and layout are derived from Figures 23, 24, 48, 49, and 50 and their
  accompanying descriptions in Chapter 3 and Appendix A.
- Bilingual EN/Tagalog microcopy (e.g. "Mga aksyon · pag-verify, pag-recall, at
  pag-merge") is reproduced where the thesis text specifies it.
- The "Recall window" queue tab from the mockups was dropped; the backend has no
  corresponding concept.
- Where a mockup element had no backing data (trust-score deltas, median resolution
  time, MFA status), it was either removed or relabelled to what is actually measured.
  The queue's "Median wait" tile, for example, is the median age of pending reports.
