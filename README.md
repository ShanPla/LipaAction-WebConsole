# LipaAction — Barangay Web Console (Static UI Mockup)

A static, front-end-only implementation of the Barangay Web Console described in
**Chapter 3, Section 3.7.3** of the LipaAction thesis (Major Revision, May 2026), covering
all five pages in the sidebar IA: **Queue, Cluster Explorer, Validation History, Audit Log,
and Settings.**

This is a UI mockup with dummy/static data — there is no backend, authentication, or
Supabase wiring. It exists to let advisers/panelists click through the actual screens
instead of reading static figures, and to serve as a visual reference for the eventual
real implementation.

## Tech stack

Matches the stack specified in Chapter 3, Section 3.8.3 (Technology Stack) for the
officials' web dashboards, with Tailwind CSS added for styling since the thesis text does
not specify a CSS framework:

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** for styling
- No backend / no Supabase client calls — all data lives in `src/data/*.ts`

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/queue`.

## Folder structure

```
src/
  app/                      Next.js App Router pages (one folder per route)
    queue/page.tsx
    cluster-explorer/page.tsx
    validation-history/page.tsx
    audit-log/page.tsx
    settings/page.tsx
  components/
    layout/                 Sidebar, TopBar, AppShell (shared page chrome)
    ui/                      Badge, Button, Tile, ReporterChip (shared primitives)
    queue/                   Queue-page-specific components
    cluster-explorer/        Cluster Explorer-specific components
    validation-history/      Validation History-specific components
    audit-log/                Audit Log-specific components
    settings/                Settings-specific components
  data/                      Static/dummy data per page (swap for real API calls later)
  types/                     Shared TypeScript interfaces
  lib/                       Small utility helpers
```

## Swapping in real data later

Every page component imports its data from `src/data/*.ts` (e.g.
`src/data/mockQueue.ts`). To wire this up to Supabase later, replace those imports with
`fetch`/Supabase client calls that return the same TypeScript shapes defined in
`src/types/index.ts` — the components themselves don't need to change.

## Notes on fidelity to the thesis mockups

- Colors, badges, and layout are derived from the Figures 23, 24, 48, 49, and 50 mockup
  screenshots and their accompanying descriptions in Chapter 3 and Appendix A.
- Bilingual EN/Tagalog microcopy (e.g. "Mga aksyon · pag-verify, pag-recall, at pag-merge")
  is reproduced where the thesis text specifies it.
- The Cluster Explorer's map panel is a simplified SVG placeholder (radius circle + pin
  markers) rather than a real map integration, since no mapping library was specified in
  the thesis.
