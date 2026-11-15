# Context & Task Router — Arkivi Përkujtimor Dritan Berisha

> **Udhërrëfyesi Qendror për Mirëmbajtjen e Aplikacionit nga Agjentët AI dhe Zhvilluesit**
> Lexoni këtë dokument para çdo modifikimi në kod. Ky dokument lidh të gjitha modulet dhe parimet e arkitekturës në mënyrë që të mos jetë e nevojshme ri-skanimi i të gjithë aplikacionit.

---

## 1. Identiteti i Projektit & Stack-u Teknik

- **Qëllimi**: Arkiv përkujtimor dinjitoz dhe libër 3D fizik për Dritan Berishën (1998–2024), i shkruar dhe i menaxhuar nga babai i tij i moshuar (Ilir Berisha).
- **Frontend Publik**: Next.js 15 (App Router, React 19) + Tailwind CSS v4 + Framer Motion + `@react-spring/web` për fizikën e librit 3D.
- **CMS & Backend**: PayloadCMS v3 (`payload: ^3.93.0`) i integruar natively në Next.js App Router (`src/payload.config.ts`).
- **Arkitektura e Dyfishtë e të Dhënave (Dual-Persistence)**:
  - **SQLite Database** (`data/arkivi.db`) përmes `@payloadcms/db-sqlite` për koleksionet e Payload, përdoruesit dhe sesionet administrative (gati për PostgreSQL në Docker prodhues).
  - **Dokument Atomik JSON** (`data/cms-data.json`) me shkrim atomik transaksional (`atomicWriteFile`) për gjendjen aktive të CMS-it (rrëfimet, fletët e librit, kronologjia, media metadata, profili i memorialit).
  - **Dosjet e Medias**: `public/uploads/` (imazhet e kompresuara WebP të ngarkuara nga Studio) dhe `media/` (direktoria statike e ngarkimit të Payload).
- **Studio Administrative**: Ndërfaqe e dedikuar në shqip **"Studio e Autorit"** (`/studio`) me **6 tab-e** kryesore, pa fjalëkalim për autorin e moshuar. Tab-i 6 përmban panelin e rezervimit/rivendosjes (`BackupManager.tsx`). Paneli teknik **Payload Super Admin** (`/admin`) kërkon kredenciale dhe mbetet vetëm për mirëmbajtje teknike nga superuser-i.
- **Optimizimi i Imazheve**: Pipeline i avancuar me Sharp 0.33.5 me kufi të rreptë server-side ≤ 5MB (refuzim HTTP 413), orientim automatik EXIF, shkallëzim maksimal deri në 2560px, dhe kompresim në WebP me cilësi 82 (~85-90% reduktim madhësie).
- **Sistemi i Rezervimit me Zero Humbje**: Mjete CLI (`npm run backup`, `npm run restore`) dhe API (`/api/backup`, `/api/restore`) me arkiva portabël ZIP, manifest SHA-256 dhe rollback atomik.

---

## 2. Task Router (Ku të Lexoni Para se të Punoni)

Kur merrni një detyrë, gjeni fjalën kyçe këtu dhe lexoni **vetëm skedarin përkatës të kontekstit** para se të modifikoni kodin:

| Fusha / Detyra | Fjalët Kyçe | Lexoni Fillimisht |
|---|---|---|
| **Arkitektura & Serveri** | Next.js, PayloadCMS, dual-persistence, build, getAppRoot, deploy | [docs/context/01-architecture-and-stack.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/01-architecture-and-stack.md) |
| **Studio e Autorit** | GUI me 6 tab-e, editor, drag-drop, rrefimet, albumi, backup manager | [docs/context/02-studio-e-autorit.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/02-studio-e-autorit.md) |
| **Libri 3D Fizik** | Libri, rrotullim fletesh, 3D, react-spring, edit inline, translateZ | [docs/context/03-3d-book-physics.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/03-3d-book-physics.md) |
| **Dizajni & Tipografia** | Ngjyrat, 60-30-10, fontet, drop-cap, stili arkivor, anti-slop | [docs/context/04-design-system-and-tokens.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/04-design-system-and-tokens.md) |
| **Baza e të Dhënave & Skemat** | Koleksione, Stories, BookSpreads, Media hook <=5MB, Globals, SQLite | [docs/context/05-database-and-collections.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/05-database-and-collections.md) |
| **Qasja & Siguria** | Autentifikim, SEC-01 (/api/cms/reset), SEC-02 (/api/users), superadmin | [docs/context/06-auth-and-permissions.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/06-auth-and-permissions.md) |
| **Rezervimi, Rivendosja & Fotot** | Backup CLI/UI, Restore CLI/UI, SHA-256, rollback, Sharp WebP, 5MB limit | [docs/context/07-backup-restore-and-uploads.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/07-backup-restore-and-uploads.md) |
| **Harta e të Gjithë Skedarëve** | Folderat, skedaret e projektit, struktura e plotë, testet e reja | [PROJECT_INDEX.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/PROJECT_INDEX.md) |

---

## 3. Rregullat e Hekurta (Hot Invariants — Mos i Shkelni Kurrë)

1. **Gjuha Shqipe në Çdo Tekst Përdoruesi**: E gjithë ndërfaqja (si publike ashtu edhe administrative) flet gjuhën shqipe me fjalë të thjeshta e të ngrohta. Mos fusni terma teknikë SaaS (si "Dashboard", "Slug", "Payload Settings", "Endpoints") në sytë e autorit. Gabimet e ngarkimit të imazheve duhet të jenë gjithmonë në shqip (p.sh. *"Madhësia e fotografisë tejkalon kufirin maksimal të lejuar prej 5MB."*).
2. **Qasja e Autorit Pa Fjalëkalim**: Autori nuk duhet të përballet kurrë me kërkesë fjalëkalimi, 2FA apo format të ndërlikuar hyrjeje kur hyn te `/studio` ose kur klikon butonin në krye të faqes. Paneli `/admin` i siguruar me fjalëkalim është rreptësisht për superuser-in teknik.
3. **Disiplina e Paletës 60-30-10**:
   - `60%`: Letër Muzeale `#F7F4EC` / Kartë `#FCFBF7`
   - `30%`: Gëlqeror i ngrohtë `#EDE8DC`, vija `1px` `#DCD6C8`, bojë qymyri `#171614`
   - `10%`: Theks Qiparisi i Thellë `#1B3B2B`
   - Mos përdorni kurrë gradientë lejla/blu SaaS, karta me hije të rënda ose pilula dekorative.
4. **Fizika e Librit 3D**: Mbani të paprekur strukturën e shtresave `translateZ` dhe koordinimin atomik të gjendjes (`ReaderNavState`) në mënyrë që fletët 3D të mos priten dhe të mos kenë dridhje gjatë kthimit.
5. **Kufiri i Rreptë Server-Side ≤ 5MB dhe Kompresimi Sharp**: Çdo imazh që tejkalon 5MB (5,242,880 bajt) refuzohet në mënyrë të prerë me status HTTP 413. Të gjitha imazhet e pranuara konvertohen në formatin WebP (quality 82, auto-orientation, max 2560px) duke zvogëluar ndjeshëm hapësirën në disk.
6. **Integriteti Zero-Humbje i Rezervimit/Rivendosjes**: Çdo arkiv backup përmban manifestin me checksums SHA-256 bit-për-bit për `data/arkivi.db` dhe `data/cms-data.json`. Para çdo ndryshimi gjatë restore-it, checksums verifikohen plotësisht dhe ruhet një snapshot automatik rollback në rast dështimi.
7. **Siguria e Endpoint-eve Administrative**: Të gjitha endpoint-et e shkrimit (`/api/stories`, `/api/media`, `/api/timeline`, `/api/hero`, `/api/site`, `/api/layout`, `/api/book/spreads`, `/api/backup`, `/api/restore`) pranojnë `x-admin-token`/Bearer që përputhet me `STUDIO_TOKEN`/`ADMIN_SECRET`/`PAYLOAD_SECRET` OSE cookie-në e vlefshme `studio_session` lëshuar nga `/api/studio/login`, përmes `src/lib/adminAuth.ts`. `/studio` mbrohet me fjalëkalim të vetëm (formular `StudioLogin`); fjalëkalimi ruhet si hash scrypt te globali `studio-settings` i Payload (`/admin` → "Studio & Fjalëkalimi"), me `STUDIO_PASSWORD` vetëm si bootstrap. `/api/cms/reset` kërkon autorizim + konfirmim në prodhim (SEC-01). `/api/users` kërkon autorizim dhe parandalon regjistrimin e paautorizuar ose zbulimin e llogarive (SEC-02).
8. **Stabiliteti i Rrugëve**: Përdorni gjithmonë funksionin `getAppRoot()` nga `src/lib/payloadClient.ts` për të zgjidhur shtigjet e skedarëve, duke shmangur paqartësinë e `process.cwd()` (SYS-01).

---

## 4. Komandat Kryesore

```powershell
# Suita e testeve automatike (67 teste me ekzekutim sekuencial të sigurt)
npm test

# Krijimi i kopjes rezervë CLI (ZIP në backups/ me manifest SHA-256)
npm run backup

# Rivendosja e të dhënave CLI nga një arkiv ZIP
npm run restore -- backups\backup-YYYY-MM-DDTHH-MM-SS.zip

# Verifikimi i tipizimit Typescript (duhet të dalë 0 gabime)
npm run lint

# Nisja e serverit lokal të zhvillimit në portin 3001
npm run dev

# Kompilimi i prodhimit Next.js + PayloadCMS
npm run build

# Nisja e serverit të prodhimit
npm run start

# Ri-gjenerimi i Import Map për PayloadCMS nëse ndryshoni komponente admin
bun run payload generate:importmap
```
