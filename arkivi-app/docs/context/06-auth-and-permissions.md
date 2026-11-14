# 06 — Modeli i Qasjes & Autentifikimi

## Çfarë Duhet të Jetë e Vërtetë (Invariants)
1. **Autori (Babai i Moshuar)**:
   - Hyn drejtpërdrejt te `/studio` pa pasur nevojë për fjalëkalim, pa forma login-i dhe pa kode verifikimi që mund ta ngatërrojnë.
   - Ka qasje të plotë për të shkruar, redaktuar, fshirë dhe ruajtur rrëfimet, librin dhe fotot.
2. **Super Administratori Teknik**:
   - Hyn te `/admin` me fjalëkalim të siguruar.
   - Përdor panelin e brendshëm të PayloadCMS për të menaxhuar llogaritë e përdoruesve, rivendosur fjalëkalimet e harruara për autorin, ose bërë ndërhyrje teknike në bazën e të dhënave.

## Ku Ndodhet Kodi
- Rruga e Autorit (pa pass): `src/app/(frontend)/studio/page.tsx`
- Rruga e Superadminit (me pass): `src/app/(payload)/admin/[[...segments]]/page.tsx`
- Koleksioni i Përdoruesve: `src/collections/Users.ts`

## Çfarë Nuk Duhet të Bëhet
- Mos vendosni `auth guard` ose bllokim me fjalëkalim mbi rrugën `/studio` që do të pengonte autorin e moshuar nga qasja e lehtë në kompjuterin e tij.
- Mos ekspozoni të dhënat e superadminit në frontend-in publik.

## Verifikimi
- Hapni në modalitet privat (incognito): `http://localhost:3001/studio` — duhet të hapet menjëherë pa kërkuar fjalëkalim.
- Hapni `http://localhost:3001/admin` — duhet të kërkojë hyrje të autorizuar të administratorit.
