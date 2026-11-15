# Project Index — Arkivi Përkujtimor Dritan Berisha

Ky dokument shërben si harta e shpejtë e navigimit dhe katalogimi i plotë i të gjithë skedarëve të projektit.

---

## 1. Skedarët Konfigurues në Rrënjë

| Skedari | Roli |
|---|---|
| [package.json](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/package.json) | Varësitë Next.js 15, PayloadCMS 3.93, Sharp 0.33, Tailwind v4, skriptet `test`, `backup`, `restore` |
| [next.config.mjs](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/next.config.mjs) | Konfigurimi i Next.js i mbështjellë me `withPayload` |
| [tsconfig.json](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/tsconfig.json) | Konfigurimi Typescript dhe shtigjet `@/*` dhe `@payload-config` |
| [.env](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/.env) | Sekretet e Payload (`PAYLOAD_SECRET`), sekreti administrativ (`ADMIN_SECRET`), dhe URI i bazës SQLite |
| [context.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/context.md) | Udhërrëfyesi qendror dhe task router për agjentët AI |
| [AGENTS.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/AGENTS.md) | Protokollet e bashkëpunimit dhe mirëmbajtjes |

---

## 2. Skriptet CLI (`scripts/`)

| Skedari | Funksioni |
|---|---|
| [scripts/backup.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/scripts/backup.ts) | Krijon arkiv ZIP vetë-përmbajtës me SQLite DB, CMS JSON, folderin uploads dhe manifest SHA-256 (`npm run backup`) |
| [scripts/restore.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/scripts/restore.ts) | Valimon integritetin SHA-256 dhe rivendos gjendjen e plotë me rollback automatik në rast gabimi (`npm run restore`) |

---

## 3. PayloadCMS v3 & Shtresa e të Dhënave (`src/`)

| Skedari / Dosja | Përshkrimi |
|---|---|
| [src/payload.config.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/payload.config.ts) | Konfigurimi kryesor i Payload: SQLite, koleksionet, globalet, lokalizimi `sq` |
| [src/lib/payloadClient.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/lib/payloadClient.ts) | Zgjidhja e rrugëve absolute `getAppRoot()` (SYS-01), transaksionet atomike JSON `atomicWriteFile`, `getCmsState`, `saveCmsState` |
| [src/lib/adminAuth.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/lib/adminAuth.ts) | Verifikimi i përbashkët i token-it administrativ (`STUDIO_TOKEN`/`ADMIN_SECRET`/`PAYLOAD_SECRET`) për të gjitha endpoint-et e shkrimit |
| [src/lib/backupArchive.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/lib/backupArchive.ts) | Motori i përbashkët ZIP (jszip) për backup/restore — pa varësi nga PowerShell, funksionon në Windows e Linux |
| [src/collections/Users.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/collections/Users.ts) | Përdoruesit me rolet `author` dhe `superuser` |
| [src/collections/Stories.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/collections/Stories.ts) | Koleksioni i rrëfimeve (titulli, periudha, paragrafët, drop-cap, statusi) |
| [src/collections/BookSpreads.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/collections/BookSpreads.ts) | Fletët dyshe të librit dhe blloqet (`prose`, `photo`, `quote`, `handwritten-note`) |
| [src/collections/Media.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/collections/Media.ts) | Hook-u `beforeValidate` për refuzimin e ngarkimeve > 5MB, resize 2560px, dhe kompresim WebP q82 |
| [src/collections/TimelineEntries.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/collections/TimelineEntries.ts) | Kronologjia e jetës dhe shërbimit |
| [src/globals/MemorialProfile.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/globals/MemorialProfile.ts) | Titulli i faqes, të dhënat e të nderuarit dhe nyjet e menysë kryesore |
| [src/globals/HeroSettings.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/globals/HeroSettings.ts) | Titujt e ballinës, rrëfimi kryesor dhe animacioni |
| [src/globals/HomeLayout.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/globals/HomeLayout.ts) | Renditja e seksioneve dinamike të ballinës dhe thënia |

---

## 4. Ndërfaqja Administrative ("Studio e Autorit" — `src/components/admin/`)

| Komponenti | Përgjegjësia |
|---|---|
| [AdminStudio.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/admin/AdminStudio.tsx) | Korniza kryesore e studios me 6 skeda navigimi (përfshirë "Rezervim & Rivendosje") |
| [BackupManager.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/admin/BackupManager.tsx) | Paneli i rezervimit dhe rivendosjes (shkarkim ZIP, ngarkim arkivi me konfirmim, njoftime statusi) |
| [AdminStudioWrapper.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/admin/AdminStudioWrapper.tsx) | Mbështjellësi i kontekstit CMS për Payload Admin View dhe `/studio` |
| [HomeHeroEditor.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/admin/HomeHeroEditor.tsx) | Redaktimi i ballinës, menysë lart dhe renditja e seksioneve me tërheqje (`@dnd-kit`) |
| [StoryManager.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/admin/StoryManager.tsx) | Shkrimi dhe menaxhimi i rrëfimeve (draft, publikuar, kapak, citim) |
| [BookBuilder.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/admin/BookBuilder.tsx) | Ndërtuesi vizual i librit me fletë dyshe dhe blloqe të renditshme |
| [MediaLibrary.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/admin/MediaLibrary.tsx) | Ngarkimi i fotografive me pre-flight check client-side (≤ 5MB) dhe njoftime Sonner toast në shqip |
| [UserManager.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/admin/UserManager.tsx) | Menaxhimi i përdoruesve autor & superadmin direkt nga Studioja |

---

## 5. Frontend Publik & Libri 3D (`src/components/frontend/`)

| Komponenti | Përgjegjësia |
|---|---|
| [PublicSite.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/frontend/PublicSite.tsx) | Orkestruesi i faqes kryesore sipas renditjes dinamike të seksioneve |
| [PublicHeader.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/frontend/PublicHeader.tsx) | Shiriti i sipërm 3-zonash me nyjet dinamike dhe butonin "Studio e Autorit" |
| [HeroSection.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/frontend/HeroSection.tsx) | Ballina kryesore me portretin dhe animacionin e butë natyror |
| [PhysicalBookReader.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/frontend/PhysicalBookReader.tsx) | Libri 3D me rrotullim fletësh, fizikë `@react-spring/web` dhe mbështetje celulari |
| [BookInlineEditor.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/frontend/BookInlineEditor.tsx) | Redaktimi i menjëhershëm i librit direkt nga faqet e hapura |
| [BookPageContent.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/frontend/BookPageContent.tsx) | Paraqitja tipografike e faqeve të majta/djathta me drop-cap |
| [StoriesFeedSection.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/frontend/StoriesFeedSection.tsx) | Lista e rrëfimeve me 3 pamje: Kolona (Grid), Indeks (Listë), Mozaik |
| [StoryReaderView.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/frontend/StoryReaderView.tsx) | Modaliteti i thelluar i leximit të një rrëfimi të vetëm |
| [MasonryGallerySection.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/frontend/MasonryGallerySection.tsx) | Galeria arkivore e fotografive familjare me zmadhim |
| [TimelineSection.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/frontend/TimelineSection.tsx) | Kronologjia e pikave kyçe të jetës |
| [QuoteBandSection.tsx](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/src/components/frontend/QuoteBandSection.tsx) | Rripi qendror i thënies përkujtimore |

---

## 6. Rrugët Next.js App Router (`src/app/`)

| Rruga | Qëllimi |
|---|---|
| `src/app/(frontend)/page.tsx` | Faqja kryesore publike (`http://localhost:3001/`) |
| `src/app/(frontend)/studio/page.tsx` | Studio e Autorit pa fjalëkalim (`http://localhost:3001/studio`) |
| `src/app/(payload)/admin/[[...segments]]/page.tsx` | Paneli Payload Super Admin me autentifikim (`http://localhost:3001/admin`) |
| `src/app/api/backup/route.ts` | GET: Shkarkon arkivin e plotë ZIP me headers të shkarkimit |
| `src/app/api/restore/route.ts` | POST: Pranon skedarin ZIP, verifikon SHA-256 dhe ekzekuton rivendosjen atomike me rollback |
| `src/app/api/media/route.ts` | POST: Verifikon kufirin ≤ 5MB (HTTP 413), vërteton strukturën me Sharp, dhe kompreson në WebP |
| `src/app/api/cms/reset/route.ts` | POST: Rivendos gjendjen e parazgjedhur (SEC-01: kërkon Bearer secret ose x-admin-token) |
| `src/app/api/users/route.ts` | GET/POST: Menaxhon përdoruesit (SEC-02: kërkon kredenciale administrative) |
| `src/app/api/cms/route.ts` | Kthen gjendjen e plotë arkivore në gjuhën shqipe |
| `src/app/api/site/route.ts` | Përditëson titullin e faqes dhe menynë |
| `src/app/api/hero/route.ts` | Përditëson ballinën kryesore dhe animacionin |
| `src/app/api/layout/route.ts` | Përditëson renditjen e seksioneve dhe thënien |
| `src/app/api/stories/route.ts` | Krijon, përditëson ose ruan rrëfime |
| `src/app/api/book/spreads/route.ts` | Ruan fletët dyshe të librit |
| `src/app/api/timeline/route.ts` | Përditëson kronologjinë |

---

## 7. Suita e Testeve Automatikë (`tests/`)

| Skedari | Sasia | Çfarë Teston |
|---|---|---|
| [tests/admin-auth.test.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/tests/admin-auth.test.ts) | 16 teste | AUDIT-2026-11-15: 401/403 pa token në të gjitha endpoint-et e shkrimit + backup/restore, 200 me token |
| [tests/backup-restore.test.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/tests/backup-restore.test.ts) | 16 teste | R2: Backup CLI, Restore CLI, API roundtrip, manifest SHA-256, korruptime, atomic rollback, disaster recovery 100% |
| [tests/upload.test.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/tests/upload.test.ts) | 15 teste | R3: Kufiri 5MB (pranim 5MB të saktë, refuzim 5MB+1 bajt me 413), kompresimi Sharp WebP q82, refuzim skedarësh të korruptuar |
| [tests/security.test.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/tests/security.test.ts) | 13 teste | R1: SEC-01 guard te /api/cms/reset, SEC-02 guard te /api/users, validimi i fjalëkalimit/emailit, mbrojtja nga ndryshimet e paautorizuara |
| [tests/api.test.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/tests/api.test.ts) | 4 teste | Integriteti i gjendjes atomike JSON, CRUD i rrëfimeve, sekuencialiteti i faqeve të librit |
| [tests/book.test.ts](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/tests/book.test.ts) | 3 teste | Validimi i fletëve dyshe (spreads), dekompozimi i folios për celular, kufijtë e navigimit |

---

## 8. Dokumentacioni i Thelluar i Kontekstit (`docs/context/`)

| Skedari | Përshkrimi |
|---|---|
| [00-INDEX.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/00-INDEX.md) | Indeksi i përgjithshëm i dokumenteve të kontekstit |
| [01-architecture-and-stack.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/01-architecture-and-stack.md) | Arkitektura e unifikuar Next.js 15 + PayloadCMS v3, dual-persistence, dhe rrugët absolute |
| [02-studio-e-autorit.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/02-studio-e-autorit.md) | Studio e Autorit me 6 tab-e, përfshirë tab-in "Rezervim & Rivendosje" dhe ngarkimin e imazheve |
| [03-3d-book-physics.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/03-3d-book-physics.md) | Fizika e Librit 3D me `@react-spring/web` dhe shtresat Z |
| [04-design-system-and-tokens.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/04-design-system-and-tokens.md) | Sistemi i ngjyrave 60-30-10, tipografia 2+1, drop-caps dhe parimet anti-slop |
| [05-database-and-collections.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/05-database-and-collections.md) | Skemat e PayloadCMS v3, SQLite, hook-u `beforeValidate` i Media, dhe gjendja atomike JSON |
| [06-auth-and-permissions.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/06-auth-and-permissions.md) | Modeli i qasjes, mbrojtja SEC-01 dhe SEC-02, kredencialet e superadminit |
| [07-backup-restore-and-uploads.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/07-backup-restore-and-uploads.md) | Sistemi i rezervimit/rivendosjes me zero humbje, kufijtë ≤ 5MB dhe kompresimi Sharp WebP |
