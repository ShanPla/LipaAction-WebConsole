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
any other role is redirected to `/not-authorized`, which offers sign-out so a
differently-scoped account can be used instead. A signed-in user who opens `/login`
is sent to the console. The signed-in official's name, role, and barangay are shown
throughout the interface.

All times are shown in Philippine Standard Time regardless of where the server or the
official's browser is set.

## Pages

| Page | Status |
|------|--------|
| **Queue** | Live. Shows the barangay's pending reports in four tabs — Emergency Fast-triage, Standard intake, Flagged duplicates, Recent validated — with a search box and a detail drawer showing everything the barangay holds on a report. Validate and Reject write to the database; rejection requires a reason. A validated report is then routed to the agencies its category maps to, by hand, after a confirmation step; the Recent validated tab separates reports awaiting routing from those already with agencies, and shows each agency's progress (acknowledged, resolved, or closed with an outcome) as the agencies record it. Opening a report's details is reported to the audit trail. A duplicate cluster can be validated as one action. The page updates live as reports change (a Supabase Realtime subscription, filtered to the barangay and enforced by Row-Level Security), falling back to a 30-second refresh if the live channel cannot connect. A report that arrives on its own is marked as new for a few seconds so it is not missed. The page can also chime when a new emergency arrives, and can raise a browser notification when an emergency has waited more than five minutes. If the data cannot be loaded it says so, rather than showing an empty queue. |
| **Cluster Explorer** | Live query, currently empty. Groups pending reports that share a `cluster_id`. The duplicate-detection service computes clusters but does not yet write them back to reports, so no report carries a `cluster_id` and the page has nothing to show. |
| **Validation History** | Live. Reviewed reports (validated or rejected) with the reviewing official, timestamp, rejection reason, and outcome filters. Exports the visible rows to CSV. |
| **Settings** | Profile is live (name, role, barangay, email, phone); the display name is editable. Language and alert preferences are saved in the browser on the current device; the alert preferences drive the Queue page's chime and browser notification. Senior barangay administrators default to Tagalog, as the thesis specifies. |
| **Audit Log** | Placeholder data, labelled as such on the page. The console writes to the audit trail (validations, rejections, and report views), but no barangay role can read it back: which columns the barangay desk may see is a data-protection decision pending with the adviser, and read access will be granted through a function that exposes only those columns, not through a table policy. |

All report data is scoped to the signed-in official's own barangay by Row Level
Security in the database. The application does not, and cannot, widen that scope.

## Privacy

Officials never see a reporter's name, whether or not the resident chose to withhold
their identity. The interface shows only "Verified reporter" or "Identity withheld".
This is deliberate — the system exposes no reporter-name field to officials at all —
and it applies to every page, the CSV export included.

Access is logged as well as restricted. Opening a report's detail drawer — the point at
which the reporter's own account of the incident reaches an official's screen — calls
the backend's `log_report_view` function, which records the official, the report, and
the resident whose data was viewed. The console never supplies the resident's identity
to that call; the backend resolves it from the report. Validations and rejections are
logged by the same mechanism through `review_report`.

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

- **Audit Log** is on placeholder data, and the page says so. Read access for barangay
  roles is waiting on a decision about which audit columns the desk may see; it is a
  data-protection question rather than an engineering one.
- **Report views are logged but cannot be read back here.** Opening a report records
  the access, and the console reports it on screen if that recording fails. Which
  audit fields a barangay desk may see is the data-protection decision above, so there
  is no who-viewed-this panel.
- **Cluster data.** The duplicate-detection service does not yet write cluster
  assignments back to reports, so the Cluster Explorer and the queue's Flagged
  duplicates tab are empty against live data. There is also no dedicated clusters
  table, so no centroid, radius, or per-report proximity signals exist to show; the
  spatial panel says so rather than displaying invented figures.
- **Priority comes from the inference service.** A report it has not scored is labelled
  Not scored rather than given a tier, and pending reports are listed highest score
  first, then longest-waiting first, with unscored reports after scored ones.
- **Routing is manual and one-way.** Nothing routes a validated report automatically;
  an official routes it, and the agencies are chosen by the category-to-agency mapping,
  not by the official. A category with no mapping is reported as needing barangay
  review rather than sent anywhere. Routing cannot be undone or redirected from the
  console, and the thesis's recall window for automatic routes is not implemented,
  because automatic routing itself is not.
- **Manual report intake** is not offered. Reports are attributable to a resident
  account by design, so intake on a walk-in resident's behalf requires a decision on
  attribution before it can be built.
- **Cluster splitting and merging** are not offered. Barangay roles cannot write
  cluster assignments, and a manual split would be undone by the next detection pass.
- **Report addresses.** Reports carry a geographic point, not an address string, so
  no location text is displayed.
- **Validation History** shows the 50 most recent reviewed reports. Filters apply to
  those rows.
- **Preferences are per device.** Language and alert settings live in the browser, not
  in the account, because no profile column exists for them and browser-notification
  permission is granted per browser anyway. Alerts fire only while the Queue page is
  open; there is no push to a closed console.
- **No full Tagalog interface.** The language preference is recorded but the screens
  remain English with Tagalog labels alongside key terms.
- **Live updates need a websocket.** On a network that blocks them, the queue says so
  in its footer and falls back to a 30-second refresh.

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
