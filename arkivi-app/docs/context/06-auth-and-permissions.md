# 06 — Modeli i Qasjes, Autentifikimi & Siguria e Prodhimit

## Çfarë Duhet të Jetë e Vërtetë (Invariants)
1. **Autori (Babai i Moshuar)**:
   - Hyn drejtpërdrejt te `/studio` pa pasur nevojë për fjalëkalim, pa forma login-i dhe pa kode verifikimi që mund ta ngatërrojnë.
   - Ka qasje të plotë për të shkruar, redaktuar, fshirë dhe ruajtur rrëfimet, librin, fotot dhe llogaritë e përdoruesve nëpërmjet tab-it "Përdoruesit & Siguria" (`src/components/admin/UserManager.tsx`).
2. **Super Administratori Teknik**:
   - Hyn te `/admin` me fjalëkalim të siguruar (`admin@arkivi.local` / `Arkivi2026!`).
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
     * Kërkesat e paautorizuara kthejnë **HTTP 401/403** pa ekspozuar listën e përdoruesve ekzistues.
     * Validon gjatësinë minimale të fjalëkalimit (të paktën 8 karaktere) dhe formatin e saktë të emailit, duke kthyer **HTTP 400 Bad Request** në rast shkeljeje.

## Ku Ndodhet Kodi
- Rruga e Autorit (pa pass): `src/app/(frontend)/studio/page.tsx`
- Rruga e Superadminit (me pass): `src/app/(payload)/admin/[[...segments]]/page.tsx`
- Menaxhimi i Përdoruesve nga Studio: `src/components/admin/UserManager.tsx`
- Endpoint-i i Mbrojtur i Përdoruesve: `src/app/api/users/route.ts`
- Endpoint-i i Mbrojtur i Rivendosjes: `src/app/api/cms/reset/route.ts`
- Skripti i Seed-it Fillestar: `src/seed/runSeed.ts`
- Koleksioni i Përdoruesve: `src/collections/Users.ts`
- Suita e Testeve të Sigurisë: `tests/security.test.ts` (13 teste)

## Çfarë Nuk Duhet të Bëhet
- Mos vendosni `auth guard` ose bllokim me fjalëkalim mbi rrugën `/studio` që do të pengonte autorin e moshuar nga qasja e lehtë në kompjuterin e tij.
- Mos ekspozoni fjalëkalimet e hash-uara apo sekretet e serverit në frontend-in publik.
- Mos lejoni thirrje të paidentifikuara te `/api/cms/reset` apo `/api/users`.

## Verifikimi
- **Studio pa fjalëkalim**: Hapni në modalitet privat (incognito): `http://localhost:3001/studio` — hapet menjëherë pa kërkuar fjalëkalim.
- **Admin teknik me fjalëkalim**: Hapni `http://localhost:3001/admin` — kërkon hyrje me `admin@arkivi.local`.
- **Verifikimi Automatik**:
```powershell
# Ekzekuton të 13 testet e sigurisë (SEC-01 & SEC-02)
npx tsx --test tests/security.test.ts
```
