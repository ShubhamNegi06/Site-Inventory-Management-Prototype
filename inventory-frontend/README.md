# Specimen Inventory — Frontend

Next.js 14 (App Router) frontend for the multi-site sample inventory. Talks
to the FastAPI backend for all data, and to Supabase directly only for
authentication (sign-in/sign-out, session refresh).

## 1. How auth flows through the app

1. `app/login/page.tsx` calls `supabase.auth.signInWithPassword` directly
   (frontend ↔ Supabase, no backend involved).
2. Supabase sets a session cookie; `middleware.ts` refreshes it on every
   request and redirects signed-out users to `/login`.
3. `lib/auth-context.tsx` reads the session, then calls `GET /auth/me` on
   the **backend** to find out the user's `role` (`admin`/`site`) and, for
   site users, their `site_id`.
4. `app/admin/layout.tsx` / `app/site/layout.tsx` use `RoleGuard` to bounce
   a signed-in user to the correct section if they land on the wrong one
   (e.g. a site user hitting `/admin/...`).
5. Every API call goes through `lib/api.ts`, which attaches the Supabase
   JWT as a `Bearer` token — the backend is the single source of truth for
   what a given role/site is allowed to see or do; the frontend's role
   checks are for navigation/UX, not the security boundary.

## 2. Prerequisites

- Node.js 18.18+ (or 20+)
- The backend running (see the backend README) — you need its URL and the
  **same** Supabase project's URL + anon key.

## 3. Setup

```bash
cd inventory-frontend
npm install

cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL      -> same value as the backend's SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY -> Project Settings -> API -> anon/public key (NOT service_role)
# NEXT_PUBLIC_API_URL           -> http://localhost:8000 (or your deployed backend URL)

npm run dev
```

Visit `http://localhost:3000`. Sign in with the admin account you
bootstrapped in the backend setup (README step 7).

## 4. Pages

| Path | Role | Purpose |
|---|---|---|
| `/login` | — | Email/password sign-in |
| `/admin/inventory` | admin | Master inventory — every site, filterable by site/type/date/search, CSV export |
| `/admin/sites` | admin | Onboard sites, create site logins |
| `/admin/samples/[id]` | admin | View/edit any sample, manage reports, delete |
| `/site/inventory` | site | That site's own inventory only |
| `/site/samples/new` | site | Add a sample — dynamic fields grouped by section, "+ Add a new field" registers a field on the fly |
| `/site/samples/[id]` | site | View/edit their own sample, upload/download reports (no delete) |

## 5. Design notes

Palette and type are defined once in `tailwind.config.ts` (see the
`ink` / `slate` / `amber` / `paper` colors) rather than scattered through
components — change them there to re-theme the whole app. Sample codes and
IDs are set in IBM Plex Mono throughout (self-hosted via `@fontsource`, no
external font requests at runtime) to visually distinguish specimen
identifiers from ordinary text, similar to a lab instrument readout.
Sample-type chips are color-coded consistently by hashing the type string
(`lib/format.ts:sampleTypeChipClass`), so "FFPE Block" always renders the
same color everywhere without needing a hardcoded lookup table.

## 6. Project structure

```
app/
  login/                sign-in
  admin/                admin section (layout has the RoleGuard + sidebar)
    inventory/           master inventory
    sites/                site management
    samples/[id]/         sample detail (admin: can edit/delete any)
  site/                  site section
    inventory/            own inventory
    samples/new/           add-sample form
    samples/[id]/           sample detail (site: own samples only)
lib/
  supabase/              browser / server / middleware Supabase clients
  auth-context.tsx       session + backend profile (role, site_id)
  api.ts                 fetch wrapper, attaches JWT to every request
  types.ts               types mirroring the backend's Pydantic schemas
  use*.ts                data-fetching hooks (samples, sites, field definitions)
components/
  AppShell.tsx, RoleGuard.tsx     layout + route protection
  SampleTable.tsx, SampleFilters.tsx, Pagination.tsx
  SampleDetail.tsx                shared by both admin & site detail pages
  DynamicFieldInput.tsx, AddFieldModal.tsx   dynamic-field system
  Modal.tsx, Spinner.tsx
```

## 7. Verified

`npm run build` was run against this exact codebase and compiles cleanly
(TypeScript checks + all 9 routes) before packaging — if you hit errors,
it's most likely an environment/version mismatch, not a bug baked in.

## 8. Next steps you may want

- **CSV export on the site side** — currently only the admin master
  inventory has an export button.
- **Bulk import** — no CSV/Excel upload for site users yet; everything
  goes through the one-sample-at-a-time form.
- **Audit log** — sample edits currently overwrite `data` with no history.
- **Deploy** — Vercel is the path of least resistance for Next.js; just
  set the three env vars there. The backend can live anywhere that can
  reach your Supabase DB and R2 bucket (Render, Fly.io, a VM, etc).
