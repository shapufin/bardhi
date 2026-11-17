# 01 — Arkitektura & Stack-u Teknik

## Çfarë Duhet të Jetë e Vërtetë (Invariants)
1. **Server i Unifikuar Next.js 15 + React 19 + PayloadCMS v3**: Aplikacioni ekzekutohet si një Next.js App Router i unifikuar. PayloadCMS v3 (`^3.93.0`) konfigurohet te `src/payload.config.ts` dhe ekzekutohet natively brenda të njëjtit proces Next.js (pa pasur nevojë për proces të dytë serveri në sfond).
2. **Arkitekturë e Dyfishtë e të Dhënave (Dual-Persistence)**:
   - **SQLite Database** (`data/arkivi.db` përmes `@payloadcms/db-sqlite`): Përdoret për menaxhimin e përdoruesve, fjalëkalimeve të hash-uara, dhe sesioneve të Payload Super Admin. PostgreSQL NUK është implementuar (`@payloadcms/db-postgres` nuk është i instaluar).
   - **Gjendja Atomike JSON** (`data/cms-data.json`): Përdoret për përmbajtjen aktive të CMS-it (rrëfimet, fletët e librit, kronologjia, media metadata, konfigurimi i kryefaqes dhe profili i memorialit). Shkrimet ekzekutohen përmes `atomicWriteFile` me skedarë të përkohshëm dhe ripërtëritje transaksionale për të parandaluar dëmtimin e të dhënave.
   - **Shtresa e Skedarëve të Medias**: `public/uploads/` mban të gjitha imazhet e kompresuara WebP të ngarkuara nga Studio e Autorit, ndërsa `media/` shërben si dosje statike për ngarkimet direkte nga paneli teknik Payload.
3. **Zgjidhja Absolute dhe e Qëndrueshme e Shtigjeve (SYS-01)**:
   - Shtigjet e skedarëve dhe dosjeve (`APP_ROOT`, `DATA_DIR`, `DATA_FILE`, `UPLOADS_DIR`) zgjidhen në mënyrë absolute përmes funksionit `getAppRoot()` te `src/lib/payloadClient.ts`.
   - `getAppRoot()` ankoron zgjidhjen në vendndodhjen fizike të modulit me `import.meta.url`, duke eliminuar plotësisht paqartësitë dhe dështimet e shkaktuara nga variabla e paqëndrueshme `process.cwd()` kur komandat ekzekutohen nga rrënja e workspace-it ose nën-dosje të thella.
4. **Pipeline i Optimizimit të Imazheve (Sharp 0.33.5)**:
   - Kufi i rreptë server-side prej 5MB (5,242,880 bajt) me kthim HTTP 413.
   - Validim i integritetit strukturor me Sharp (refuzim HTTP 400 për skedarë të dëmtuar).
   - Auto-orientim EXIF (`.rotate()`), zvogëlim brenda 2560x2560px pa zmadhuar imazhe më të vogla, dhe kompresim në WebP me cilësi 82 (`effort: 4`), duke arritur reduktim 85-90% të madhësisë.
5. **Sistemi i Rezervimit me Zero Humbje (R2)**:
   - Krijon arkiva portabël ZIP që bashkojnë bazën SQLite, dokumentin JSON, dhe dosjen e mediave me manifest SHA-256 (`manifest.json`).
   - Rivendosja verifikon integritetin kriptografik SHA-256 para çdo ndërhyrjeje dhe ruan një snapshot rollback automatik.

6. **Faqja publike renderohet në server (F-19)**: `src/app/(frontend)/page.tsx` është server component (`force-dynamic`): lexon `getCmsState()`, heq draftet dhe ia kalon `PublicHome` (client, `src/components/frontend/PublicHome.tsx`) përmes `CmsProvider initialCms`; titulli/përshkrimi vijnë nga `generateMetadata`. Pa `initialCms` (Studio) provider-i ngarkon nga `/api/cms`. Test: `tests/ssr-home.test.ts`.

## Ku Ndodhet Kodi
- Konfigurimi Payload: `src/payload.config.ts`
- Zgjidhja e Shtigjeve & Lidhësi i të Dhënave: `src/lib/payloadClient.ts`
- Rrugët Next.js të Payload: `src/app/(payload)/admin/[[...segments]]/page.tsx` dhe `src/app/(payload)/api/[...slug]/route.ts`
- Rrugët e Frontend-it: `src/app/(frontend)/page.tsx` dhe `src/app/(frontend)/studio/page.tsx`
- Rrugët e Dedikuara API:
  - `/api/cms/route.ts` — Leximi i gjendjes së plotë arkivore
  - `/api/media/route.ts` — Ngarkimi dhe kompresimi Sharp WebP (≤5MB)
  - `/api/backup/route.ts` — Shkarkimi i arkivit ZIP (GET)
  - `/api/restore/route.ts` — Rivendosja atomike me rollback (POST)
  - `/api/cms/reset/route.ts` — Rivendosja e paracaktuar e mbrojtur (SEC-01)
  - `/api/users/route.ts` — Menaxhimi i mbrojtur i llogarive (SEC-02)
- Skriptet CLI: `scripts/backup.ts` dhe `scripts/restore.ts`

## Çfarë Nuk Duhet të Bëhet
- Mos përdorni kurrë `process.cwd()` të drejtpërdrejtë për të gjetur skedarët e të dhënave ose ngarkimeve; përdorni gjithmonë `getAppRoot()` ose konstantet e eksportuara nga `payloadClient.ts`.
- Mos ndani frontend-in dhe backend-in në porte të ndryshme në prodhim; Next.js dhe Payload ekzekutohen së bashku në portin 3001.
- Mos anashkaloni verifikimin SHA-256 gjatë manipulimit të arkivave të të dhënave.

## Verifikimi
```powershell
# Verifikimi i tipizimit Typescript (0 gabime)
npm run lint

# Verifikimi i të gjithë testeve të arkitekturës dhe sigurisë (suita e plotë)
npm test

# Verifikimi i kompilimit Next.js + Payload prodhues
npm run build
```
