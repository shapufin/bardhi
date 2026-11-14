# 06 — Modeli i Qasjes & Autentifikimi

## Çfarë Duhet të Jetë e Vërtetë (Invariants)
1. **Autori (Babai i Moshuar)**:
   - Hyn drejtpërdrejt te `/studio` pa pasur nevojë për fjalëkalim, pa forma login-i dhe pa kode verifikimi që mund ta ngatërrojnë.
   - Ka qasje të plotë për të shkruar, redaktuar, fshirë dhe ruajtur rrëfimet, librin, fotot dhe llogaritë e përdoruesve nëpërmjet tab-it "Përdoruesit & Siguria" (`src/components/admin/UserManager.tsx`).
2. **Super Administratori Teknik**:
   - Hyn te `/admin` me fjalëkalim të siguruar (`admin@arkivi.local` / `Arkivi2026!`).
   - Përdor panelin e brendshëm të PayloadCMS për të menaxhuar koleksionet e të dhënave, sesionet dhe ndërhyrjet në bazën SQLite / PostgreSQL.

## Ku Ndodhet Kodi
- Rruga e Autorit (pa pass): `src/app/(frontend)/studio/page.tsx`
- Rruga e Superadminit (me pass): `src/app/(payload)/admin/[[...segments]]/page.tsx`
- Menaxhimi i Përdoruesve nga Studio: `src/components/admin/UserManager.tsx`
- API i Përdoruesve: `src/app/api/users/route.ts`
- Skripti i Seed-it Fillestar: `src/seed/runSeed.ts`
- Koleksioni i Përdoruesve: `src/collections/Users.ts`

## Çfarë Nuk Duhet të Bëhet
- Mos vendosni `auth guard` ose bllokim me fjalëkalim mbi rrugën `/studio` që do të pengonte autorin e moshuar nga qasja e lehtë në kompjuterin e tij.
- Mos ekspozoni fjalëkalimet e hash-uara apo sekretet e serverit në frontend-in publik.

## Verifikimi
- Hapni në modalitet privat (incognito): `http://localhost:3001/studio` — duhet të hapet menjëherë pa kërkuar fjalëkalim dhe të shfaqë të 5 tab-et përfshirë "Përdoruesit & Siguria".
- Hapni `http://localhost:3001/admin` — kërkon hyrje të autorizuar me kredencialet e seeded admin (`admin@arkivi.local`).
