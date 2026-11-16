# 06 — Modeli i Qasjes, Autentifikimi & Siguria e Prodhimit

## Çfarë Duhet të Jetë e Vërtetë (Invariants)
1. **Autori (Babai i Moshuar)**:
   - Hyn te `/studio` me një fjalëkalim të vetëm — formulari i thjeshtë `StudioLogin` nuk kërkon llogari/email dhe nuk ekspozon asnjë sekret në HTML.
   - Fjalëkalimi menaxhohet nga superadmini teknik te `/admin` → globali **"Studio & Fjalëkalimi"** (`studio-settings`) dhe ruhet vetëm si hash scrypt — kurrë plaintext. Ndryshimi hyn në fuqi menjëherë, pa rebuild.
   - `STUDIO_PASSWORD` në `.env` shërben vetëm si bootstrap derisa të caktohet fjalëkalimi në Payload; pasi të ekzistojë hash-i, env humbet rëndësinë.
   - Sesioni ruhet në cookie `studio_session` (HttpOnly, SameSite=Lax, 30 ditë) të nënshkruar me HMAC-SHA256 — `src/lib/studioAuth.ts`. Kërkesat e shkrimit dërgohen me cookie automatikisht (same-origin), pa token në frontend.
   - Ka qasje të plotë për të shkruar, redaktuar, fshirë dhe ruajtur rrëfimet, librin, fotot dhe llogaritë e përdoruesve nëpërmjet tab-it "Përdoruesit & Siguria" (`src/components/admin/UserManager.tsx`).
2. **Super Administratori Teknik**:
   - Hyn te `/admin` me fjalëkalim të siguruar (kredencialet nga `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD`).
   - Përdor panelin e brendshëm të PayloadCMS për të menaxhuar koleksionet e të dhënave, sesionet dhe ndërhyrjet në bazën SQLite / PostgreSQL.
3. **Mbrojtja e Sigurisë së Prodhimit (R1 — SEC-01 & SEC-02)**:
   - **SEC-01: Mbrojtja e Endpoint-it të Fshirjes/Rivendosjes (`/api/cms/reset`)**:
     * Parandalon fshirjen aksidentale ose dashakeqe të të gjithë bazës së të dhënave nga kërkesa të paautorizuara.
     * Kërkon Bearer Token në header-in `Authorization` ose `x-admin-token` që përputhet me `ADMIN_SECRET` ose `PAYLOAD_SECRET`.
     * Kërkesat pa kredenciale refuzohen menjëherë me **HTTP 401 Unauthorized** dhe mesazh në shqip (*"I paautorizuar: Rivendosja e të dhënave kërkon kredenciale administrative."*). Kredencialet e pasakta kthejnë **HTTP 403 Forbidden**.
     * Në mjedisin prodhues (`NODE_ENV=production`), zbatohet një masë shtesë sigurie që kërkon konfirmim të shprehur përmes header-it `x-confirm-reset: true` ose token-it administrativ.
   - **SEC-02: Mbrojtja e Endpoint-it të Përdoruesve (`/api/users`)**:
     * Eliminon krijimin e paautorizuar të përdoruesve superuser dhe parandalon zbulimin (enumeration) e llogarive.
     * Qasja në `GET /api/users` dhe `POST /api/users` kërkon autorizim administrativ (Bearer token, `x-admin-token`, ose cookie të vlefshme sesioni nga Payload Super Admin).
     * Mbështet formatin e dyfishtë të kërkesave: `multipart/form-data` (i përdorur nga paneli Payload Admin UI te `/admin/collections/users/create`) dhe `application/json` (i përdorur nga Studio dhe klientët API). Kthen përgjigje të pasuruar me `{ doc, user, message }` për kompatibilitet të plotë me të dyja ndërfaqet.
     * Kërkesat e paautorizuara kthejnë **HTTP 401/403** pa ekspozuar listën e përdoruesve ekzistues.
     * Validon gjatësinë minimale të fjalëkalimit (të paktën 8 karaktere), përputhjen me `confirmPassword` dhe formatin e saktë të emailit, duke kthyer **HTTP 400 Bad Request** në rast shkeljeje.
4. **Mbrojtja e Përbashkët e Todos Endpoint-eve të Shkrimit (AUDIT-2026-11-15 + STUDIO-AUTH)**:
   - Të gjitha endpoint-et e mutacionit pranojnë dy kredenciale: `x-admin-token`/`Authorization: Bearer` që përputhet me `STUDIO_TOKEN`, `ADMIN_SECRET` ose `PAYLOAD_SECRET`, OSE cookie e vlefshme `studio_session` e lëshuar nga `/api/studio/login` (helper i përbashkët `src/lib/adminAuth.ts` — `verifyAdminAuth`).
   - Login-i publik: `POST /api/studio/login` (verifikon hash-in e globalit `studio-settings` ose `STUDIO_PASSWORD`; 5 tentime/10 min për IP) dhe `POST /api/studio/logout`.
   - Të mbrojtura: `POST/DELETE /api/stories`, `POST /api/media`, `PUT/DELETE /api/media/[id]`, `PUT /api/timeline`, `PUT /api/hero`, `PUT /api/site`, `PUT /api/layout`, `PUT /api/book/spreads`, `GET /api/backup`, `POST /api/restore`.
   - Të hapura për publikun (vetëm lexim): `GET /api/cms`, `GET /api/media`.
   - Kërkesat pa kredenciale kthejnë **HTTP 401**; kredenciale të pasakta **HTTP 403**.
   - Kufizime përmbajtjeje: `PUT /api/media/[id]` pranon vetëm fushat e lejuara (whitelist); `DELETE /api/media/[id]` shkëput automatikisht referencat (zero-lockout cascade) nga rrëfim/hero/libër dhe heq skedarin nga disku; të gjitha payload-et JSON kanë kufinj madhësie dhe gjatësie fushash.

## Ku Ndodhet Kodi
- Rruga e Autorit (me fjalëkalim Studio): `src/app/(frontend)/studio/page.tsx` + `src/components/admin/StudioLogin.tsx`
- Rruga e Superadminit (me pass): `src/app/(payload)/admin/[[...segments]]/page.tsx`
- Globali i fjalëkalimit të Studio-s: `src/globals/StudioSettings.ts`
- Menaxhimi i Përdoruesve nga Studio: `src/components/admin/UserManager.tsx`
- Endpoint-i i Mbrojtur i Përdoruesve: `src/app/api/users/route.ts`
- Endpoint-i i Mbrojtur i Rivendosjes: `src/app/api/cms/reset/route.ts`
- Login/Logout i Studio-s: `src/app/api/studio/login/route.ts`, `src/app/api/studio/logout/route.ts`
- Helper i përbashkët i autorizimit: `src/lib/adminAuth.ts`
- Sesione & hash-e të Studio-s: `src/lib/studioAuth.ts`
- Motor i përbashkët i arkivave ZIP (jszip, pa PowerShell): `src/lib/backupArchive.ts`
- Skripti i Seed-it Fillestar: `src/seed/runSeed.ts`
- Koleksioni i Përdoruesve: `src/collections/Users.ts`
- Suita e Testeve të Sigurisë: `tests/security.test.ts` (13 teste) + `tests/admin-auth.test.ts` (16 teste)

## Çfarë Nuk Duhet të Bëhet
- Mos ekspozoni fjalëkalimet e hash-uara apo sekretet e serverit në frontend-in publik. Session cookie është HttpOnly — asgjë nuk injektohet në HTML.
- Mos lejoni thirrje të paidentifikuara te `/api/cms/reset`, `/api/users`, `/api/backup`, `/api/restore` apo çdo endpoint tjetër mutacioni.

## Verifikimi
- **Studio me fjalëkalim**: Hapni `http://localhost:3001/studio` — shfaqet formulari i kyçjes; pa fjalëkalim nuk hapet Studioja.
- **Admin teknik me fjalëkalim**: Hapni `http://localhost:3001/admin` — kërkon hyrje me email-in e administratorit teknik.
- **Ndryshimi i fjalëkalimit**: `/admin` → "Studio & Fjalëkalimi" → shkruani fjalëkalimin e ri → ruani. Hyn në fuqi menjëherë.
- **Verifikimi Automatik**:
```powershell
# Testet e sigurisë + session auth
npx tsx --test tests/security.test.ts tests/admin-auth.test.ts tests/studio-auth.test.ts
```
