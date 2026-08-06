# Sample Inventory API — Backend Setup

FastAPI backend for the multi-site block sample (FFPE / Frozen tumor / etc.)
inventory system. Postgres (Supabase) with a JSONB column for dynamic
fields, Cloudflare R2 for report files, Supabase Auth (JWT) for login.

## 1. How the pieces fit together

- **Supabase Auth** issues the JWT when a user logs in on the frontend.
  The backend never handles passwords directly — it just verifies the JWT
  Supabase issued, using `SUPABASE_JWT_SECRET`.
- **`users` table** (ours, not Supabase's) stores the *role* (`admin` /
  `site`) and, for site users, which `site_id` they belong to. Its `id`
  column is always equal to the matching row's id in Supabase's own
  `auth.users` table — that's what links "who logged in" to "what they're
  allowed to see."
- **`samples` table** has a few real columns (site, sample code, sample
  type, collection date) for fast filtering/sorting, and one `data JSONB`
  column that holds everything else — demographics, diagnosis info, and
  any custom fields a site adds on the fly.
- **"Master inventory"** is not a separate table. It's just `GET /samples`
  called by an admin with no `site_id` filter — every site's rows,
  consolidated. Site users hitting the same endpoint are always
  auto-scoped to their own `site_id`, so they structurally cannot see
  another site's data (or the master view).
- **Reports** (PDF/image files) are stored in Cloudflare R2 as objects;
  Postgres only stores the file's metadata + object key. Downloads are
  served through short-lived presigned URLs, not proxied through the API.

## 2. Prerequisites

- Python 3.11+
- A Supabase project (free tier is fine): https://supabase.com/dashboard
- A Cloudflare account with R2 enabled: https://dash.cloudflare.com

## 3. Set up Supabase

1. Create a new Supabase project.
2. Go to **Project Settings → Data API / API Keys** and note down:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (NOT the anon key) → `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **Project Settings → Data API → JWT Settings** and copy the
   **JWT Secret** → `SUPABASE_JWT_SECRET`. This is what lets our backend
   verify tokens without calling Supabase on every request.
4. Go to **Project Settings → Database → Connection string → URI**. Use
   the **Session pooler** connection string (port 5432) for this backend
   → `DATABASE_URL`. Fill in your DB password.
5. In **Authentication → Providers**, make sure Email/Password is enabled.
   (We create users server-side via the admin API — see step 6 — so you
   can leave public sign-ups disabled; only admins create site logins.)

## 4. Set up Cloudflare R2

1. Dashboard → **R2 Object Storage → Create bucket**, e.g.
   `inventory-reports` → `R2_BUCKET_NAME`.
2. **R2 → Manage API Tokens → Create API Token** with Object
   Read/Write on that bucket → `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
3. Your account ID (top-right of the R2 dashboard) → `R2_ACCOUNT_ID`, and
   the S3 endpoint is `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`
   → `R2_ENDPOINT_URL`.
4. Leave the bucket **private** — we generate short-lived presigned
   download URLs from the backend, so the bucket never needs to be public.

## 5. Local project setup (using `uv`)

```bash
git clone <this-repo>   # or unzip the provided folder
cd inventory-backend

uv sync          # creates .venv and installs everything from pyproject.toml / uv.lock

cp .env.example .env
# now fill in every value in .env using what you gathered in steps 3-4
```

`uv sync` reads `pyproject.toml`, resolves dependencies, and writes/uses
`uv.lock` for reproducible installs — no need for `requirements.txt` or a
manually-activated venv. From here on, prefix commands with `uv run` (it
transparently uses `.venv`), e.g. `uv run alembic upgrade head`,
`uv run uvicorn app.main:app --reload`.

If you'd rather use plain `pip`/`venv`, `requirements.txt` is still
included and works the same way as before (`pip install -r requirements.txt`).

## 6. Run the database migration

The models are defined in `app/models/`; Alembic turns them into actual
tables.

```bash
uv run alembic revision --autogenerate -m "init tables"
uv run alembic upgrade head
```

This creates: `sites`, `users`, `samples`, `field_definitions`, `reports`.

## 7. Create the first admin (bootstrap)

There's a chicken-and-egg problem: only an admin can create users, but no
admin exists yet. Do this once, manually:

1. In the Supabase Dashboard → **Authentication → Users → Add user**,
   create your admin's email/password (tick "Auto Confirm User").
2. Copy that user's **UID** from the users list.
3. In **SQL Editor**, run:

```sql
insert into users (id, email, role, is_active)
values ('<paste-the-uid-here>', 'admin@yourcompany.com', 'admin', true);
```

From here on, that admin can log in via the frontend and use
`POST /users/site-user` to create every subsequent site login — no more
manual SQL needed.

## 8. Run the API

```bash
uv run uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for interactive Swagger docs — you can
authorize with a real JWT (copy it from Supabase after logging in on the
frontend, or via `supabase.auth.sign_in_with_password` in a quick script)
and try every endpoint from there.

## 9. Quick endpoint map

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/auth/me` | any logged-in user | role + site_id, used to route to the right dashboard |
| POST | `/sites` | admin | onboard a new hospital/pathology site |
| GET | `/sites` | admin | list sites |
| POST | `/users/site-user` | admin | create a login for a site |
| POST | `/samples` | site | add a sample to their own inventory |
| GET | `/samples` | both | site → own inventory only; admin → master (all sites), or one site via `?site_id=` |
| GET | `/samples?search=&sample_type=&date_from=&date_to=` | both | filter/search |
| PATCH | `/samples/{id}` | both (own site only, unless admin) | edit a sample; `data` is merged, not replaced |
| DELETE | `/samples/{id}` | admin | soft-delete |
| POST | `/field-definitions` | both | register a new dynamic field (used by "add new field" in the sample form) |
| GET | `/field-definitions` | both | fields available to render on the form |
| POST | `/samples/{id}/reports` | both (own site only, unless admin) | upload one or more PDFs/images |
| GET | `/samples/{id}/reports` | both | list a sample's reports |
| GET | `/reports/{id}/download` | both | presigned download URL (15 min expiry) |
| DELETE | `/reports/{id}` | admin | remove a report |

## 10. Project structure

```
app/
  core/       settings (.env), JWT verification & role dependencies
  db/         SQLAlchemy engine/session
  models/     SQLAlchemy tables (Site, User, Sample, FieldDefinition, Report)
  schemas/    Pydantic request/response models
  api/routes/ one file per resource (auth, sites, users, samples, field_definitions, reports)
  services/   R2 (storage.py) and Supabase admin (supabase_admin.py) clients
alembic/      migrations
```

## 11. Notes on the dynamic-fields design

`Sample.data` is a Postgres `JSONB` column, so any field a site adds on
the fly (e.g. a custom biomarker column) is stored immediately with no
migration needed. `field_definitions` is a lightweight registry — it
doesn't constrain what's *in* `data`, it just tells the frontend "here are
the fields known so far, with their labels/types" so forms render
consistently and admins can see what fields exist across sites. Filtering
across dynamic fields (`?search=`) currently does a simple text match on
the whole JSON blob; if you need fast filtering on a *specific* dynamic
field at scale later, add a GIN index on `data` (e.g.
`CREATE INDEX ON samples USING GIN (data)`), which supports efficient
`data @> '{"key": "value"}'` containment queries.
