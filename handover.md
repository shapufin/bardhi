# HANDOVER — Arkivi Përkujtimor (BARDHI / `arkivi-app`)

> Audience: the next engineer or AI agent who will change this app.
> Produced by a full audit on **2026-11-17**, HEAD `2340ba5` (branch `main`, clean tree).
> Every finding below is tagged **CONFIRMED** (reproduced live or proven by quoted code) or **PLAUSIBLE** (code strongly suggests it, not reproduced). Read §12 before touching anything.

---

## 0. TL;DR for the next agent

1. The app is **one Next.js 15 process** (`arkivi-app/`, port 3001) that hosts: a public memorial site (`/`), a simplified Albanian-language editor for an elderly author (`/studio`), and the Payload CMS technical panel (`/admin`).
2. **The site's content does NOT live in Payload.** It lives in one JSON file, `arkivi-app/data/cms-data.json`, read/written by custom routes under `src/app/api/*`. Payload (SQLite `data/arkivi.db`) is only used for **users/login and the Studio password**. The Payload collections `stories`, `book-spreads`, `media`, `timeline-entries` and globals `memorial-profile`, `hero-settings`, `home-layout` are **not read by the site** — editing them in `/admin` changes nothing visible.
3. **Fixed (commit `fix(uploads)`, merged to `main`):** in production (`next start` / Docker) photos uploaded through the Studio return **404** until the server restarts, because Next only serves `public/` files that existed when the server started. See F-01.
4. Tests now run in a temp data root (`ARKIVI_DATA_ROOT`) and no longer touch live `data/`. New test files must `import './test-env'` first OR rely on the `npm test` preload; running a file with bare `tsx --test` without the preload and without importing test-env first would hit live data.
5. Baseline today: `npm test` → **99 pass / 0 fail**, `npm run lint` (`tsc --noEmit`) → **0 errors**. Docs claiming "79/79" or "67/67" are stale.
6. UI copy is **Albanian**, aimed at an elderly, non-technical author. Keep it that way (no technical jargon, large text, clear verbs like "Ruaj", "Fshij", "Rikthe").
7. Windows dev machine: use PowerShell syntax in docs/commands (`;` not `&&`). Production is Linux Docker.

---

## 1. What the product is

A private-family memorial website for **Dritan Berisha**, written by his father (the "Autori"). It has:

| Surface | URL | Who uses it | Auth |
|---|---|---|---|
| Public memorial site | `/` | Anyone | None |
| Studio e Autorit (simplified editor) | `/studio` | The father (author) | Password → signed HttpOnly cookie `studio_session` |
| Payload technical admin | `/admin` | Technical superadmin | Payload email + password (`payload-token` cookie) |

Public site sections (order + on/off controlled from the Studio): hero, featured story, stories feed (3 layout variants), masonry photo gallery, 3D book spotlight + full-screen 3D page-turning book reader, quote band, timeline. Story reader view for individual stories.

Studio has **6 tabs** (`src/components/admin/AdminStudio.tsx`): Kryefaqja & Menyja (home/hero/menu/section order), Rrëfimet (stories), Ndërtuesi i Librit (book), Albumi i Fotove (photos), Përdoruesit & Siguria (users), Rezervim & Rivendosje (backup/restore). Plus a "Pamje e Drejtpërdrejtë" live-preview dialog (desktop/mobile).

---

## 2. Repository layout

```
BARDHI/                         <- git root
├── handover.md                 <- this file
├── context.md                  <- Albanian task router (partly stale, see §11)
├── TEST_READY.md               <- old test certificate (51 tests, stale)
├── docker-compose.yml          <- PRODUCTION compose (app + cloudflared tunnel)
├── .env.example                <- env template for compose (do not commit real .env)
├── docs/context/08-...md       <- duplicate of arkivi-app/docs/context/08 (differs!)
├── graphify-out/, .trace-mcp/, .playwright-mcp/  <- tool caches (gitignored / noise)
└── arkivi-app/                 <- THE APPLICATION
    ├── package.json            <- npm scripts (see §4)
    ├── Dockerfile, docker-entrypoint.sh, .dockerignore
    ├── next.config.mjs, postcss.config.mjs, tsconfig.json
    ├── AGENTS.md, context.md, PROJECT_INDEX.md, TEST_READY.md
    ├── docs/context/00..08-*.md   <- domain docs (Albanian)
    ├── docs/audits/<surface>-<date>/round-1.md  <- 3 prior audit reports
    ├── data/                   <- RUNTIME: arkivi.db, cms-data.json (gitignored), cms-data.example.json
    ├── public/uploads/         <- RUNTIME: uploaded .webp photos (gitignored)
    ├── public/assets/images/   <- 6 seed photos used by default content
    ├── public/src/assets/images/, media/   <- duplicate copies of the same 6 photos (unused, see F-24)
    ├── backups/                <- RUNTIME: backup ZIPs (gitignored)
    ├── scripts/backup.ts, scripts/restore.ts   <- CLI
    ├── tests/*.test.ts         <- node:test via tsx
    └── src/
        ├── payload.config.ts
        ├── payload-types.ts            <- generated
        ├── app/(frontend)/layout.tsx, page.tsx, globals.css, studio/page.tsx
        ├── app/(payload)/admin/..., api/[...slug]/route.ts, layout.tsx, custom.css
        ├── app/api/<custom routes>     <- see §6
        ├── collections/  Users, Stories, BookSpreads, Media, TimelineEntries
        ├── globals/      MemorialProfile, HeroSettings, HomeLayout, StudioSettings
        ├── components/admin/      Studio UI
        ├── components/frontend/   public site + 3D book
        ├── components/ui/         shadcn-style primitives (Radix)
        ├── context/CmsContext.tsx  <- client state + all mutation calls
        ├── lib/payloadClient.ts    <- paths + JSON store (THE data layer)
        ├── lib/adminAuth.ts, lib/studioAuth.ts  <- auth
        ├── lib/backupArchive.ts    <- backup/restore engine (jszip)
        ├── lib/defaultData.ts      <- DEFAULT_CMS_STATE (seed content)
        ├── seed/runSeed.ts         <- creates cms-data.json + superadmin
        └── types/cms.ts            <- CmsState types (source of truth for content shape)
```

---

## 3. Tech stack (installed versions)

| Area | Tech |
|---|---|
| Framework | Next.js **15.5.29** (App Router), React 19 |
| CMS / auth | Payload **3.93.0** (`@payloadcms/next`, `db-sqlite` via libsql, `richtext-lexical`) |
| Content store | JSON file `data/cms-data.json` (custom, not Payload) |
| Images | sharp 0.33 (server-side WebP q82, max 2560px, EXIF auto-rotate) |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`), CSS variables in `src/app/(frontend)/globals.css` |
| UI primitives | Radix (dialog, select, switch, tabs, label, slot), lucide-react icons, sonner toasts |
| Drag & drop | @dnd-kit (section ordering, book blocks) |
| Animation | @react-spring/web (book page physics), framer-motion 12 + `motion` 14.14.0 (both installed) |
| Backup | jszip |
| Tests | `node:test` run by `tsx` (no Jest/Vitest) |
| Runtime | Node 24 locally; Docker image `node:20-bookworm-slim` |
| Deploy | Docker Compose + Cloudflare Tunnel (`cloudflared`) |

Both `package-lock.json` and `bun.lock` exist; `npm` is what scripts, Dockerfile and tests use. `AGENTS.md` says `bun run lint` — treat `npm run lint` as canonical.

---

## 4. Running it

All commands from `arkivi-app\` (PowerShell):

```powershell
npm install
npm run dev          # next dev on http://localhost:3001
npm run lint         # tsc --noEmit  (must be 0 errors; next build does NOT typecheck)
npm test             # DESTRUCTIVE to data/ — see F-08. ~6 minutes.
npm run build        # production build
npm start            # next start -p 3001
npm run seed         # tsx src/seed/runSeed.ts (creates cms-data.json + superadmin if missing)
npm run backup       # writes backups\backup-<timestamp>.zip
npm run restore -- backups\backup-<timestamp>.zip
```

Run a single test file: `npx tsx --test tests\security.test.ts`

### Environment variables (names only — values live in `.env`, never commit them)

| Var | Used by | Notes |
|---|---|---|
| `PAYLOAD_SECRET` | Payload, Studio session HMAC, **also accepted as admin API token** | Required. Rotating it logs everyone out. |
| `ADMIN_SECRET` | Admin API token (`x-admin-token` / `Authorization: Bearer`) | Used by tests and scripts. |
| `STUDIO_TOKEN` | Optional extra admin API token | Legacy; UI no longer sends it. |
| `STUDIO_PASSWORD` | Bootstrap Studio password | Only used while `studio-settings.password` is empty in Payload. |
| `DATABASE_URI` | Payload SQLite | Default `file:./data/arkivi.db` — **relative to cwd** (F-17). |
| `INITIAL_ADMIN_EMAIL` / `_PASSWORD` / `_NAME` | `runSeed.ts` | If password empty in production, seed generates one and **prints it to container logs**. |
| `NEXT_PUBLIC_SERVER_URL` | Payload live preview URL | |
| `PORT` | compose host port mapping | Container always listens on 3001. |
| `TUNNEL_TOKEN` | cloudflared | |
| `NODE_ENV` | cookie `Secure` flag, reset-route extra check, seed behaviour | |

---

## 5. Data architecture (read this twice)

### 5.1 Three persistence layers

| Layer | Path | Holds | Written by |
|---|---|---|---|
| JSON content store | `data/cms-data.json` | **All site content**: site config, hero, sections, stories, book, timeline, quote band, media metadata | `saveCmsState()` in `src/lib/payloadClient.ts` |
| SQLite (Payload) | `data/arkivi.db` | `users` (auth), `studio-settings` global (Studio password scrypt hash), plus unused content collections | Payload |
| Files | `public/uploads/*.webp` | Uploaded photos | `POST /api/media` |

Seed photos referenced by default content live in `public/assets/images/` (`/assets/images/...` URLs).

### 5.2 Content shape — `src/types/cms.ts` is the contract

`CmsState = { locale:'sq', site, hero, sections[], stories[], bookTitle, bookSubtitle, bookCoverImageId, bookSpreads[], timeline[], quoteBand{quote,attribution}, media[], updatedAt }`

- `Story`: id, title, subtitle, eraLabel, publishedDate (free text), readingMinutes, coverImageId, galleryImageIds[], bodyParagraphs[] (plain strings), pullQuote?, status `published|draft`, featured (only one story may be featured — enforced in `POST /api/stories`).
- `BookSpread`: id, chapterLabel, spreadTitle, left/rightPageNumber (server recomputes as `index*2+1/+2`), leftBlocks[], rightBlocks[].
- `BookBlock`: id, type `prose|photo|quote|handwritten-note`, heading?, content, imageId?, caption?, dropCap?.
- `MediaAsset`: id, title, url, alt, caption, year, aspectRatio `16:9|4:3|3:4|1:1`, isUpload?.
- `PageSectionConfig`: id, type (7 section types), label, heading, subheading, enabled, storiesVariant?.
- References between objects are **string ids** (e.g. `hero.heroImageId`, `story.coverImageId`, `block.imageId`). There is no referential integrity except the cascade in `DELETE /api/media/[id]` and the featured-story fallback in `DELETE /api/stories/[id]`.

### 5.3 How the JSON store works (`src/lib/payloadClient.ts`)

- `getAppRoot()` resolves the app folder from the module location (`import.meta.url`), falling back to cwd heuristics. Exports `APP_ROOT`, `DATA_DIR`, `DATA_FILE`, `UPLOADS_DIR`. **Always use these, never `process.cwd()`** (project rule SYS-01).
- `getCmsState()`: ensures dirs/file exist; reads with small retry on EPERM/EBUSY; if JSON is invalid or `locale !== 'sq'` / `site.navMenu` is missing → writes `.corrupt.bak` and **throws `CmsStateCorruptError`** without touching the file (F-14); only an empty/missing file initialises defaults.
- `saveCmsState(next)`: serialized by an in-process promise mutex; stamps `locale:'sq'` and `updatedAt`; writes temp file + rename (falls back to copyFile on Windows locks).
- Every mutation route does `getCmsState()` → modify → `saveCmsState()`. The read is **outside** the mutex, so two concurrent writes can lose one (F-13). Acceptable with one author, but don't add background writers without fixing it.

### 5.4 Payload config (`src/payload.config.ts`)

- `admin.components.views.dashboard` is **replaced by the Studio** (`AdminStudioWrapper`) — the `/admin` home shows the Studio UI.
- DB: `sqliteAdapter` with `DATABASE_URI`. Docs mention PostgreSQL in production — **not implemented** (`@payloadcms/db-postgres` is not installed).
- Collections: `users` (auth, `role: author|superuser`, `read: () => true` — see F-02), `stories`, `book-spreads`, `media` (has a 5MB `beforeValidate` hook and image sizes), `timeline-entries`. Globals: `memorial-profile`, `hero-settings`, `home-layout` (all unused by the site) and `studio-settings` (Studio password, scrypt-hashed in a `beforeChange` field hook).
- `runSeed.ts` still writes default stories into the Payload `stories` collection on first boot — dead data.

---

## 6. HTTP API (custom routes in `src/app/api`)

Auth helper: `verifyAdminAuth(req)` in `src/lib/adminAuth.ts` → authorized if header token (`x-admin-token` or `Authorization: Bearer`) equals one of `STUDIO_TOKEN|ADMIN_SECRET|PAYLOAD_SECRET`, **or** a valid `studio_session` cookie. Wrong token → 403, no credentials → 401. Routes use `verifyAdminAuthAsync`, which additionally accepts a `superuser` Payload session (`payload-token` cookie).

| Method & path | Auth | What it does | File |
|---|---|---|---|
| GET `/api/cms` | public | Returns `CmsState`; drafts only for authenticated callers. Also the Docker healthcheck. | `api/cms/route.ts` |
| POST `/api/cms/reset` | header token only (no cookie); prod also needs `x-admin-token` or `x-confirm-reset` | Overwrites content with `DEFAULT_CMS_STATE` | `api/cms/reset/route.ts` |
| PUT `/api/site` | admin | Site identity + nav menu (max 20 items) | `api/site/route.ts` |
| PUT `/api/hero` | admin | Hero fields (empty string = keep old value — F-16) | `api/hero/route.ts` |
| PUT `/api/layout` | admin | `sections[]` (max 50) + `quoteBand` | `api/layout/route.ts` |
| POST `/api/stories` | admin | Upsert story by id (new ones prepended); 512KB cap; enforces single featured | `api/stories/route.ts` |
| DELETE `/api/stories/[id]` | admin | Removes story; re-points hero.featuredStoryId | `api/stories/[id]/route.ts` |
| PUT `/api/book/spreads` | admin | Replaces whole book (max 300 spreads × 100 blocks/side); 5MB cap | `api/book/spreads/route.ts` |
| PUT `/api/timeline` | admin | Replaces timeline (max 500) — **no UI calls this** (F-15) | `api/timeline/route.ts` |
| GET `/api/media` | public | `{ media }` | `api/media/route.ts` |
| POST `/api/media` | admin | JSON `{dataUrl(base64), title, caption, year, alt, aspectRatio}` → 5MB limit (413), sharp validation (400), WebP to `public/uploads/media-<ms>.webp`, auto aspect ratio | `api/media/route.ts` |
| PUT `/api/media/[id]` | admin | Whitelisted fields: title, caption, year, alt, aspectRatio | `api/media/[id]/route.ts` |
| DELETE `/api/media/[id]` | admin | Cascade: clears hero image, book cover, story cover/gallery, book block imageIds; unlinks file | `api/media/[id]/route.ts` |
| GET `/api/backup` | admin | Streams a fresh backup ZIP | `api/backup/route.ts` |
| POST `/api/restore` | admin | multipart field `archive` (≤200MB) → verify + restore | `api/restore/route.ts` |
| GET/POST `/api/users` | admin **or any logged-in Payload user** | List (sanitized) / create user (JSON or multipart `_payload` for Payload admin UI) | `api/users/route.ts` |
| POST `/api/studio/login` | public, rate-limited | See §7 | `api/studio/login/route.ts` |
| POST `/api/studio/logout` | public | Clears cookie — **not called by any UI** (F-11) | `api/studio/logout/route.ts` |
| `/api/*` anything else | Payload REST | Payload's catch-all `(payload)/api/[...slug]/route.ts`, incl. `/api/users/:id`, `/api/users/login`, `/api/globals/*`, `/api/stories/:id` GET etc. | |

**Route precedence gotcha:** a specific Next route (`api/users/route.ts`) wins over Payload's catch-all only for that exact path. `/api/users/1` is served by Payload with Payload's access rules (F-02). When you add a custom route under a Payload collection slug, check what Payload still serves under it.

Client side, **all** mutations go through `CmsContext` (`src/context/CmsContext.tsx` → `mutate()`), which shows sonner toasts in Albanian and replaces client state with the server's response. `UserManager` and `BackupManager` call `fetch` directly.

---

## 7. Auth model (as implemented, not as documented)

- **Studio login** `POST /api/studio/login` `{ password, identifier? }`, tried in order:
  1. If `identifier` given: find user by email or name, verify Payload PBKDF2 hash.
  2. `studio-settings.password` scrypt hash (set by superadmin in `/admin` → "Studio & Fjalëkalimi").
  3. **Password-only: tries the password against every user (up to 50)**, including the superadmin.
  4. `STUDIO_PASSWORD` env, only if no `studio-settings` hash exists.
  On success: sets `studio_session` (`<expiryMs>.<hmac-sha256(PAYLOAD_SECRET)>`, HttpOnly, SameSite=Lax, 30 days, Secure in prod). If a user matched, also logs into Payload and sets `payload-token` → that user gets `/admin` too.
- Session is stateless and not bound to a user; it is revoked globally by changing the Studio password (epoch file) or rotating `PAYLOAD_SECRET`. A logout button clears the cookie on that browser only.
- Rate limit: in-memory (`loginRateLimit.ts`), 10/10min per client key + 100/10min global; resets on restart. Resets on restart; not shared between processes.
- `/studio` page (server component) checks the cookie and renders `StudioLogin` or the Studio.
- **Roles are enforced** (see F-04 fix): `role` (`author|superuser`) is checked by Payload access rules in `src/lib/roles.ts`. Any Payload user can do everything in `/admin` (Payload default access = "logged in"), including creating superusers and changing the Studio password (F-04).
- `CmsProvider` still carries a `studioToken` prop that is always `''` (legacy from when a token was injected into HTML). Safe to remove.

---

## 8. Frontend notes

- `src/app/(frontend)/page.tsx` is a **client component**: content is fetched from `/api/cms` in `useEffect` after load (no SSR, shows a "Po hapet..." loading screen; no SEO content in HTML) (F-19).
- `PublicSite.tsx` renders `cms.sections` filtered by `enabled`, switch on `section.type`. Drafts are filtered out here (and in `StoriesFeedSection`), not on the server.
- 3D book: `PhysicalBookReader.tsx` (1,217 lines — largest file). `canEdit` prop **defaults to `true`** and `PublicSite` doesn't pass it, so the public reader shows "Redakto Librin" (F-05). Inline editing via `BookInlineEditor.tsx`. Z-layer hierarchy (`translateZ`) is documented in `docs/context/03-3d-book-physics.md` — don't change without testing page turns in a browser. Mobile (<768px) switches to single-page swipe mode.
- Design system: palette/typography rules in `docs/context/04-design-system-and-tokens.md` (paper `#F7F4EC`, cypress green `#1B3B2B` primary, Cormorant Garamond / Plus Jakarta Sans / JetBrains Mono from Google Fonts). Tokens are CSS vars in `globals.css`. The book components contain ~94 hardcoded hex colors (F-22).
- No emoji in UI; lucide icons only. Albanian copy everywhere. Elderly-author rule: Studio text should be ≥16px — there are 18 `text-xs` uses in `components/admin` (F-23).

---

## 9. Backup / restore (`src/lib/backupArchive.ts`, shared by API + CLI)

- ZIP layout: `manifest.json`, `data/arkivi.db`, `data/cms-data.json`, `public/uploads/*`. Manifest has version `1.0.0`, SHA-256 of db + json, counts.
- Restore: magic-bytes check, ≤200MB, manifest version/appName check, path traversal guard, SHA-256 verify **before** writing, rollback snapshot of db+json in `data/.rollback-<ts>/`, writes files, removes snapshot. Uploads are added/overwritten, never deleted; uploads are not part of the rollback.
- Not included: the `media/` folder (docs say it is).
- The DB is copied with a plain file read while Payload holds it open, and restore overwrites the file under the running libsql connection with no restart (F-09).
- `BackupManager.tsx` reloads the page 3s after a successful restore (browser only, not the server).

---

## 10. Deployment

- Root `docker-compose.yml`: service `arkivi-app` (build `./arkivi-app`, port `${PORT:-3001}:3001`, `env_file: .env`, volumes `./arkivi-app/data`, `./arkivi-app/public/uploads`, `./arkivi-app/backups`, healthcheck `curl /api/cms`) + `cloudflared` tunnel (`TUNNEL_TOKEN`). Port 3001 is also published on the host.
- `Dockerfile`: 2 stages on `node:20-bookworm-slim`; `npm install --legacy-peer-deps` (not `npm ci`); `next build` with BuildKit cache mounts; runner copies `node_modules`, `.next`, `public`, `src`, `scripts`, `data`; runs as **root**; entrypoint runs `runSeed.ts` via tsx then `npm start`.
- `next.config.mjs`: `typescript.ignoreBuildErrors: true` and `webpackMemoryOptimizations` (6GB ARM host). Always run `npm run lint` before deploying. `images.remotePatterns` allows `https://**`.
- `.dockerignore` excludes runtime data, uploads, backups and `.env*` (F-20). The root `docker-compose.yml` mounts `data`, `public/uploads` and `backups` from the host.

---

## 11. Existing documentation and how far to trust it

| Doc | Trust | Known drift |
|---|---|---|
| `arkivi-app/docs/context/06-auth-and-permissions.md` | Mostly right | Says rate limit 5/10min (code: 10). Doesn't mention that roles are unenforced or `/api/users/:id` exposure. |
| `.../07-backup-restore-and-uploads.md` | Mostly right | Says 67 tests (now 79), says `media/` is backed up (it isn't). |
| `.../01-architecture-and-stack.md`, `05-database-and-collections.md` | Misleading | Imply content lives in Payload collections and "PostgreSQL in production" — neither is true. |
| `.../02-studio-e-autorit.md`, `08-docker-production-deployment.md` | Stale | Say the Studio needs **no password** — it does now. |
| `.../03-3d-book-physics.md`, `04-design-system-and-tokens.md` | Good | |
| Root `context.md` | Stale | Points to deleted mockup folder `në-kujtim-të-dritan-berishës/`; font list differs from doc 04; says 51 tests. |
| `TEST_READY.md` (root and app) | Stale | 51 tests, "100% pass". |
| `docs/audits/*/round-1.md` | Historical | Useful for what was fixed and why. |
| Root `docs/context/08-...` vs app copy | Duplicate, differ | Keep one. |

Project rules worth keeping (from `AGENTS.md` / docs): use `getAppRoot()` constants; keep Albanian, jargon-free Studio copy; don't remove the Media `beforeValidate` 5MB hook; update `src/types/cms.ts` + frontend when changing content shape; never bypass SHA-256 checks in restore; verify UI changes in a browser; facts-not-diary in docs.

---

## 12. Audit findings (2026-11-17)

Severity: CRITICAL = data loss / security hole / wrong data shown / lockout; HIGH = user-visible breakage or integrity risk; MEDIUM = degraded or latent; LOW = polish/DX.

### CRITICAL

**F-01 Uploaded photos 404 in production until restart — FIXED (route `src/app/api/uploads/[file]/route.ts` + rewrite in `next.config.mjs`, test `tests/uploads-serve.test.ts`).** Restart the container once after deploy to recover existing uploads. Original report below.
`next start` only serves `public/` files that existed at server start. Probe on the existing prod build: `/favicon.ico` 200, `/assets/images/...` 200, file copied into `public/uploads/` after start → **404**; after restarting the server → 200. Studio uploads write to `public/uploads` (`api/media/route.ts:114-115`) and return `/uploads/<file>` URLs, so in Docker every new photo is broken on the public site and in the Studio until the container restarts. Dev mode hides this.
Fix: serve uploads through a route handler (e.g. `src/app/uploads/[file]/route.ts` or `/api/uploads/[file]`) that streams from `UPLOADS_DIR` with a strict basename check, correct `Content-Type` and cache headers; keep stored URLs the same or migrate them. Test: write a file after server start, expect 200.

### HIGH

**F-02 `GET /api/users/:id` leaks accounts without auth — FIXED (`read: ({req}) => Boolean(req.user)`, test `tests/users-access.test.ts`).** Original report: `Users.access.read: () => true` (`src/collections/Users.ts:10-11`). Unauthenticated `curl /api/users/1` → 200 with superadmin email, name, role, `sessions`; `/api/users/2` also works (enumerable). The custom `GET /api/users` is protected, but Payload's catch-all serves `/:id`. Fix: `read: ({ req }) => Boolean(req.user)` (or superuser only); add a test hitting `/api/users/1` without a cookie.

**F-03 Draft stories are public — FIXED (`GET /api/cms` filters drafts unless `verifyAdminAuth`; test `tests/cms-drafts.test.ts`).** Original report: `GET /api/cms` returns all stories; live response includes the draft "Pasditet e së Shtunës në Punishten e Drurit". The Studio labels drafts "Draft Privat". Fix: the public route strips `status !== 'published'`; the Studio needs an authenticated full-state endpoint (e.g. `GET /api/cms?scope=studio` behind `verifyAdminAuth`), and `CmsProvider` must use it inside `/studio`.

**F-04 Roles are not enforced; any user = superadmin — FIXED (`src/lib/roles.ts`, access rules on `users` + `studio-settings`, `/api/users` superuser gating; test `tests/roles.test.ts`). Caveat: the Studio cookie is still not bound to a user, so it can only create `author` accounts.** Original report: `role` is never checked. Any user who logs into the Studio with their email gets a `payload-token` (`login/route.ts:136-177`) and Payload's default access (logged in) lets them create users, edit `studio-settings`, etc. `verifyUsersAuth` accepts any Payload user (`users/route.ts:14-25`), so an `author` can create a `superuser`. Fix: access functions on Users/StudioSettings checking `req.user.role === 'superuser'`; restrict `/api/users` POST of `role: 'superuser'` to superusers.

**F-05 Public visitors see the "Redakto Librin" edit button — FIXED (`canEdit` defaults to false; only the Studio preview in `BookBuilder` passes it; test `tests/book-edit-visibility.test.ts`). Inline editing from the public book no longer exists; re-adding it needs a client-visible session signal.** Original report: `PhysicalBookReader` `canEdit = true` default (`PhysicalBookReader.tsx:61`); `PublicSite.tsx:68` doesn't pass it. Anonymous visitor opening the book sees the button; saving fails with a 401 toast. Fix: default `canEdit=false`, pass `true` only from `BookBuilder`.

**F-06 Test baseline is red — FIXED (suite now 85/85 after F-08 isolation + `createBackupArchive` calling `ensureStorage`).** Original report: `npm test`: 79 tests, 74 pass, 5 fail, all in "Zero-Loss Backup & Restore" (CLI backup spawn hits the 30s timeout → following tests cascade). The same CLI run alone takes ~12s and exits 0, so this is a slow/flaky harness, not a broken backup. Fix: raise timeout / reuse the in-process engine, make dependent tests independent.

**F-07 Login brute-force protection is bypassable — FIXED (`src/lib/loginRateLimit.ts`: key = `cf-connecting-ip` or last XFF hop, plus global 100/10min cap, bounded map; test `tests/login-ratelimit.test.ts`). Still in-memory/per-process, and password-only mode still tests every user per attempt.** Original report: Rate limit keyed on `x-forwarded-for` first value (`login/route.ts:31`), which the client controls (Cloudflare appends, not replaces). Combined with password-only mode trying every user (step 3), one request tests a guess against all accounts. Fix: key on `cf-connecting-ip` (behind tunnel) or the socket address, add a global limit, cap the Map.

**F-08 Tests mutate the live data folder — FIXED (`ARKIVI_DATA_ROOT` env in `payloadClient.ts`; `npm test` preloads `tests/test-env.ts` via `--import`, which makes a per-process temp data root seeded with read-only copies of the dev DB and uploads; verified live data hashes unchanged after a full run).** Original report: Tests import the real `DATA_DIR`/`UPLOADS_DIR`; `backup-restore.test.ts:722` deletes `data/arkivi.db`; other tests create users. Evidence in the dev DB: user `duplicate-user-...@example.com`; `public/uploads` has 20 files of which 0 are referenced by `cms-data.json`; `cms-data.json` rewritten during the run. Tests are excluded from the Docker image, so production is safe today, but any run on a real data copy damages it. Fix: let `getAppRoot()`/data paths honour an env override (e.g. `ARKIVI_DATA_ROOT`) and point tests at a temp dir.

**F-09 Restore overwrites the SQLite file under a running connection — MITIGATED (backup uses `VACUUM INTO`; restore deletes -wal/-shm/-journal; in production `/api/restore` exits the process 1.5s after responding so Docker restarts it on the restored DB; tests `tests/db-snapshot.test.ts`). Caveats: the restart relies on Docker `restart: unless-stopped`; CLI restore must be run with the server stopped; manifest DB checksum is now of the archived snapshot. `@libsql/client` is now an explicit dependency.** Original report: `restoreFromArchiveBuffer` writes `data/arkivi.db` (`backupArchive.ts:228`) while Payload/libsql has it open; no restart, no `-wal/-shm` handling. Possible stale reads or corruption of users/Studio password. Backup also reads the live DB file without SQLite's backup API. Fix: use `VACUUM INTO` / backup API for snapshots; after restore, restart the process (or tell the operator to) and delete stale `-wal/-shm`.

**F-10 Two content models; `/admin` content editing does nothing — CONFIRMED (code).** Only `studio-settings` and `users` are read by app code (grep: `findGlobal` only in login route; `stories` collection only written by seed). Editors/agents who edit `/admin` → Stories etc. will see no change. Fix: either remove/hide the unused collections and globals in Payload, or migrate content into Payload. Decide before building features.

### MEDIUM

- **F-11 FIXED (logout button in `AdminStudio`; `data/session-epoch` revokes sessions on Studio password change; paths moved to `src/lib/dataPaths.ts`; test `tests/session-revocation.test.ts`). Original:** No logout in the UI — `/api/studio/logout` is never called; sessions last 30 days and can't be revoked (stateless HMAC; password change doesn't invalidate). Add a "Dil" button; add a session version stored in `studio-settings` to invalidate.
- **F-12 FIXED and was real (reproduced 401): `verifyAdminAuthAsync` also accepts a `superuser` Payload session; used by all mutation routes; test `tests/admin-session.test.ts`. The sync `verifyAdminAuth` remains for token/cookie-only checks.**
- **F-13 FIXED (`serialized()` wrapper on all read-modify-write mutation handlers; test `tests/concurrent-writes.test.ts`; single-process only). New mutation routes MUST use it. Original:** Lost updates — read-modify-write outside the save mutex in every mutation route (§5.3).
- **F-14 FIXED (`getCmsState` throws `CmsStateCorruptError`, keeps the file, writes a `.corrupt.bak`; empty/missing file still initialises defaults; test `tests/corrupt-state.test.ts`). Operators: if the site shows the init error, restore a backup or delete the bad file. Original:** Silent reset to defaults — `getCmsState` replaces the live file with defaults on any parse error or `locale !== 'sq'` (`payloadClient.ts:164-184`). A `.corrupt.bak` is written but nobody is told. Prefer failing loudly (500 + log) over serving defaults.
- **F-15 Timeline cannot be edited** — `saveTimeline` exists in `CmsContext` but no component calls it; the public timeline is frozen at seed content.
- **F-16 Fields can't be cleared** — hero/site/book routes use `clip(x) || current.x`, so sending `''` keeps the old value (e.g. removing the hero image is impossible except by deleting the photo).
- **F-17 DB path not anchored** — `DATABASE_URI` default `file:./data/arkivi.db` is cwd-relative, while backup uses absolute `DATA_DIR/arkivi.db`; running from another cwd makes Payload and backup use different files.
- **F-18 Media delete order** — file is unlinked before the state save (`media/[id]/route.ts:103-108`); ids are `media-${Date.now()}` (collision on same-ms uploads).
- **F-19 Public site is client-rendered** — no SSR/SEO, loading flash, full state (with drafts) shipped to every visitor.
- **F-20 FIXED (`.dockerignore` now excludes `.env*`, `data/*.db`, `cms-data.json`, uploads, backups; test `tests/dockerignore.test.ts`; not verified with a real `docker build`). Original:** Docker build context leaks local data — `.dockerignore` misses `data/`, `public/uploads/`, `.env`; runner `COPY --from=builder /app/data`.
- **F-21 Secret reuse / open image proxy** — `PAYLOAD_SECRET` is both session key and API token; `images.remotePatterns` `https://**` lets anyone use the image optimizer as a proxy; container runs as root; `ignoreBuildErrors: true`.

### LOW

- **F-22** ~94 hardcoded hex colours (`PhysicalBookReader` 64, `BookPageContent` 22, `BookInlineEditor` 8) and 22 inline `style={{}}` — move to CSS vars.
- **F-23** 18 `text-xs` uses in Studio components vs the ≥16px rule for the elderly author.
- **F-24** Same 6 seed images stored three times (`public/assets/images`, `public/src/assets/images`, `media/`); only `/assets/images` is referenced.
- **F-25** Dead code: `studioToken` plumbing in `CmsContext`, `UserManager`, `BackupManager`; Payload `formatOptions/imageSizes` on an unused `media` collection.
- **F-26** `DELETE /api/stories/:id` returns 200 for unknown ids; rate-limit Map never pruned; 12 empty `catch {}` blocks (mostly intentional fallbacks).
- **F-27** Both `framer-motion` and `motion` installed; both `bun.lock` and `package-lock.json`.
- **F-28** Docs drift listed in §11.

### Not verified (state honestly if asked)

- Responsive layout at 1440px / 280px, contrast, focus order, target sizes: **UNMEASURED** this round (the browser pane was hidden, viewport reported 0px). Prior audit (2026-11-15) reported no horizontal overflow; not re-checked.
- F-09 and F-12 were not reproduced.
- Production server itself (Cloudflare tunnel, real `.env`) was not inspected.

---

## 13. Recommended fix order

1. **F-01** uploads route (users are losing photos *right now* in prod — after deploy, restart the container once to recover existing uploads).
2. **F-02, F-03, F-04, F-05** — small, high-value security/privacy fixes; each needs a regression test in `tests/security.test.ts` / `admin-auth.test.ts`.
3. **F-08 + F-06** — isolate tests to a temp data root, then get the suite green; only after this is "tests pass" meaningful.
4. **F-07, F-11** — login hardening + logout button.
5. **F-10** — decide the single content model; delete or wire the unused Payload collections; update docs 01/05.
6. **F-09, F-14, F-13** — data-integrity hardening (SQLite-safe backup, loud failures, mutex around read-modify-write).
7. **F-15, F-16** — Studio feature gaps (timeline editor, clearable fields).
8. Docs sync (§11) after each change: update the matching `docs/context/0X-*.md`, `context.md` router, and remove stale test counts.

---

## 14. Working rules for the next agent

- Before editing, read the relevant `arkivi-app/docs/context/0X-*.md`, but trust **code over docs** (§11).
- Content shape change → update `src/types/cms.ts`, `src/lib/defaultData.ts`, the sanitizer in the matching `api/*/route.ts`, `CmsContext`, the Studio editor, the public component, and existing `data/cms-data.json` files (no migration system exists — `getCmsState` will **reset to defaults** if required keys are missing).
- New mutation route → wrap the handler in `serialized(...)` (F-13), call `verifyAdminAuth(req)` first, sanitize with `clip()`-style limits, go through `getCmsState`/`saveCmsState`, return the full new state (the client expects it), Albanian error messages, add 401/403 cases to `tests/admin-auth.test.ts`.
- New file paths → import from `src/lib/payloadClient.ts`; never `process.cwd()`.
- Never run `npm test` against data you care about (F-08). Back up `data/` and `public/uploads/` first.
- After any change: `npm run lint` (0 errors), relevant tests, and a browser check of `/`, `/studio` (6 tabs) and the 3D book. For upload changes, test with `npm run build; npm start`, not only `npm run dev` (F-01 only shows in prod mode).
- Secrets: never commit `.env`; an old `PAYLOAD_SECRET` exists in early git history — rotate secrets and rewrite history before making the repo public.
- Commits: conventional commits (`fix(scope): ...`), one logical fix per commit; prior audits live in `arkivi-app/docs/audits/<surface>-<date>/round-N.md`.

---

## 15. Audit evidence log

- Preflight: tree clean at `2340ba5`; Node v24.15.0; `node_modules` present; trace index partially stale (still lists the deleted mockup folder).
- `npm test` → `tests 79, pass 74, fail 5` (exit 1), duration ~373s. Failing: CLI backup (30045ms timeout) + 4 dependents.
- `npx tsx scripts/backup.ts` standalone → exit 0 in 12s.
- `npx tsc --noEmit` → exit 0.
- Prod-build probe (`next start` on a spare port): uploads added after start 404 → 200 after restart.
- `curl /api/users/1`, `/api/users/2` unauthenticated → 200 with email/role; `PATCH /api/users/1` unauthenticated → 403; `GET /api/users` → 401; `GET /api/globals/studio-settings` → 403.
- `curl /api/cms` → 5 stories, 1 draft included.
- Browser (built-in pane, prod build): after clicking "Hap Librin", button "Redakto Librin" present for an anonymous visitor.
- Side effects of this audit: the test run rewrote local `data/cms-data.json`/uploads as tests always do; probe files and the probe backup ZIP were deleted; the audit itself changed no source; the later F-01 fix added the uploads route, rewrite and test.
