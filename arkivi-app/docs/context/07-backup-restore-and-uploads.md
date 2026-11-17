# 07 — Rezervimi, Rivendosja dhe Kufijtë e Ngarkimit të Imazheve

> Ky dokument përshkruan sistemin e rezervimit (backup) dhe rivendosjes (restore) me humbje zero të të dhënave, si dhe arkitekturën e plotë të kufizimit dhe kompresimit të fotografive të ngarkuara.

---

## 1. Sistemi i Rezervimit dhe Rivendosjes me Humbje Zero (R2)

### 1.1 Arkitektura e Ruajtjes së Të Dhënave

Aplikacioni mbështetet në një arkitekturë me **tri shtresa persistence** që rezervohen së bashku:

| Shtresa | Vendndodhja | Përmbajtja |
|---|---|---|
| **SQLite database** | `data/arkivi.db` | Koleksionet PayloadCMS (përdoruesit, llogaritë, sesionet e siguruara) |
| **CMS state JSON** | `data/cms-data.json` | Rrëfimet, fletët e librit 3D, kronologjia, media metadata, konfigurimi i kryefaqes dhe profili |
| **Imazhet e ngarkuara** | `public/uploads/` & `media/` | Skedarët `.webp` të kompresuar dhe asetet e ngarkuara |

### 1.2 Formati i Arkivit ZIP dhe Manifesti SHA-256

Çdo ekzekutim backup-i prodhon një arkiv të pavarur e portabël `backup-YYYY-MM-DDTHH-MM-SS.zip` në dosjen `backups/` me strukturën:

```
backup-2026-11-14T15-12-06.zip
├── manifest.json         ← Verifikim SHA-256, numëruesit, timestamp, versioni
├── data/
│   ├── arkivi.db         ← SQLite database (kopje bit-për-bit)
│   └── cms-data.json     ← Gjendja e plotë aktive e CMS
└── public/
    └── uploads/
        ├── media-*.webp  ← Të gjitha imazhet e ngarkuara
        └── ...
```

**manifest.json — Kontrata Kriptografike:**
```json
{
  "appName": "arkivi-app",
  "version": "1.0.0",
  "timestamp": "2026-11-14T15:12:06.000Z",
  "contents": {
    "database": "data/arkivi.db",
    "cmsState": "data/cms-data.json",
    "uploads": "public/uploads/"
  },
  "checksums": {
    "database": "<sha256-hex-64-karaktere>",
    "cmsState": "<sha256-hex-64-karaktere>"
  },
  "counts": {
    "stories": 5,
    "bookSpreads": 5,
    "media": 7
  }
}
```

### 1.3 Skedarët e Implementimit

| Skedari | Funksioni |
|---|---|
| `scripts/backup.ts` | CLI backup: krijon arkivin ZIP me staging të izoluar në `backups/` |
| `scripts/restore.ts` | CLI restore: validon manifestin dhe checksums SHA-256 para restaurimit me rollback atomik |
| `src/app/api/backup/route.ts` | `GET /api/backup`: transmeton ZIP si attachment download |
| `src/app/api/restore/route.ts` | `POST /api/restore`: pranon multipart/form-data ZIP dhe kryen rivendosje atomike |
| `src/components/admin/BackupManager.tsx` | UI panel i integruar si skeda e 6-të në Studio e Autorit |
| `src/components/admin/AdminStudio.tsx` | Navigimi i Studios me tab-in e ri "Rezervim & Rivendosje" (ikona `HardDrive`) |

### 1.4 Komandat CLI

```powershell
# Krijimi i një kopjeje të re rezervë
npm run backup
# ose direkt:
npx tsx scripts/backup.ts

# Rivendosja nga një arkiv ekzistues ZIP
npm run restore -- backups\backup-2026-11-14T15-12-06.zip
# ose direkt:
npx tsx scripts/restore.ts backups\backup-2026-11-14T15-12-06.zip
```

### 1.5 Ndërfaqja HTTP API

- **`GET /api/backup`**:
  * Kërkon autorizim administrativ (`x-admin-token` ose `Bearer`) — arkivi përmban hash-et e fjalëkalimeve dhe nuk është publik.
  * Prodhon një arkiv të ri ZIP në mënyrë dinamike dhe e kthen si stream me header-in:
    `Content-Disposition: attachment; filename="backup-YYYY-MM-DDTHH-MM-SS.zip"`
  * `Content-Type: application/zip`
- **`POST /api/restore`**:
  * Kërkon autorizim administrativ (`x-admin-token` ose `Bearer`).
  * Pranon `multipart/form-data` me fushën `archive` që përmban skedarin `.zip` (kufi madhësie 200MB → HTTP 413).
  * Verifikon magic bytes (`PK\x03\x04`), nxjerr të dhënat në dosje të përkohshme staging, dhe llogarit hashes SHA-256.
  * Nëse hashes përputhen 100%, ruan një snapshot rollback të gjendjes ekzistuese dhe kryen restaurimin.
  * Në rast gabimi të papritur gjatë kopjimit, rikthen automatikisht snapshot-in e mëparshëm me garanci zero korruptimi.
  * Kthen `{ success: true, timestamp, counts, message }` ose kod gabimi HTTP 400 me përshkrim shqip.

### 1.6 Paneli Administrativ Web UI (`BackupManager.tsx`)

Skeda e 6-të **"Rezervim & Rivendosje"** në Studio e Autorit (`/studio`):
- Butoni kryesor **"Shkarko Kopjen Rezervë"** me tregues ngarkimi dhe shkarkim automatik të skedarit `.zip`.
- Zona e ngarkimit të skedarit me drag-and-drop ose përzgjedhje nga kompjuteri.
- Kuti konfirmimi e detyrueshme para ekzekutimit për të shmangur mbishkrimin e paqëllimshëm të të dhënave.
- Paneli i rezultateve që tregon sasinë e rrëfimeve, faqeve të librit dhe fotove të restauruara.
- Rindezje/rifreskim automatik i ndërfaqes pas rivendosjes së suksesshme.

### 1.6b Konsistenca e SQLite (F-09)

- Backup merr DB-në me `VACUUM INTO` (`snapshotDatabase` te `src/lib/backupArchive.ts`), pra përfshin ndryshimet në WAL dhe është i sigurt ndërsa Payload e ka hapur; baitet e arkivit NUK janë identike me skedarin live, ndaj `manifest.checksums.database` është SHA-256 e DB-së brenda arkivit.
- Restore fshin `arkivi.db-wal/-shm/-journal` para dhe pas shkrimit. Në prodhim (`NODE_ENV=production`) `/api/restore` e mbyll procesin 1.5s pas përgjigjes që Docker (`restart: unless-stopped`) ta rihapë me DB-në e rikthyer; UI rifreskohet pas 8s. CLI `npm run restore` duhet ekzekutuar kur serveri është i ndalur.
- Teste: `tests/db-snapshot.test.ts`.

### 1.7 Protokolli i Sigurisë — Zero Humbje Të Dhënash

1. **Verifikim SHA-256 bit-për-bit**: Hashes llogariten mbi skedarët fizikë dhe krahasohen me manifestin para se të preket ndonjë skedar në prodhim.
2. **Rollback Atomik**: Snapshot i plotë i gjendjes prodhuese mbahet në kujtesë të përkohshme; në rast dështimi, gjendja kthehet menjëherë prapa.
3. **Mbrojtje nga Versionet**: Pranohen vetëm arkiva të përputhshëm me versionin e mbështetur (`SUPPORTED_VERSIONS = ['1.0.0']`).
4. **Pavarësi Platforme**: Krijimi dhe leximi i ZIP-it mbështetet në motorin e përbashkët `src/lib/backupArchive.ts` (jszip) — funksionon identikisht në Windows dhe në kontejnerët Linux të prodhimit (pa varësi nga PowerShell).

---

`DELETE /api/media/[id]` ruan fillimisht gjendjen pa foton dhe fshin skedarin fizik pas ruajtjes (jo përpara). Test: `tests/media-integrity.test.ts`.

## 2. Kufijtë e Ngarkimit dhe Pipeline i Kompresimit Sharp (R3)

### 2.1 Kufiri i Fortë Server-Side (5MB)

Zbatuar në dy nivele serveri:

1. **Rruga e Përshtatur API (`src/app/api/media/route.ts`)**:
   - `MAX_BINARY_SIZE`: saktësisht **5,242,880 bajt** (5.00 MB).
   - Kontroll i hershëm i gjatësisë së stringut base64 (`MAX_BASE64_LENGTH`).
   - Kontroll i rreptë i madhësisë binare të buffer-it:
     ```json
     HTTP 413 Payload Too Large
     { "error": "Madhësia e fotografisë tejkalon kufirin maksimal të lejuar prej 5MB." }
     ```
   - Validim strukturor me Sharp: nëse buffer-i nuk përbën një format imazhi të njohur (PNG, JPEG, WebP, GIF), kthehet:
     ```json
     HTTP 400 Bad Request
     { "error": "Skedari i ngarkuar nuk është një imazh i vlefshëm." }
     ```

2. **Koleksioni PayloadCMS (`src/collections/Media.ts`)**:
   - Hook-u `beforeValidate` kontrollon madhësinë e skedarit (`file.size > 5 * 1024 * 1024`).
   - Hedh `ValidationError` me mesazhin: *"Madhësia e fotografisë tejkalon kufirin maksimal të lejuar prej 5MB."*

3. **Kontrolli Paraprak në Klient (`src/components/admin/MediaLibrary.tsx`)**:
   - Para dërgimit me HTTP, `file.size` krahasohet me `5 * 1024 * 1024`.
   - Nëse e tejkalon, ngarkimi bllokohet menjëherë në shfletues dhe shfaqet njoftimi me Sonner toast:
     *"Fotografia është më e madhe se 5MB. Ju lutemi zgjidhni një fotografi më të vogël."*

### 2.2 Pipeline i Kompresimit të Lartë Sharp

Çdo fotografi e pranuar përpunohet përmes pipeline-it:

```
Imazhi Origjinal (JPEG/PNG/WebP deri në 5MB)
         │
         ▼
1. Auto-orientim EXIF: sharp(buffer).rotate()
         │
         ▼
2. Downscale Proporcional: .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
         │
         ▼
3. Kompresim i Avancuar WebP: .webp({ quality: 82, effort: 4 })
         │
         ▼
4. Ruajtje në public/uploads/ si media-{timestamp}-{8 hex rastësorë}.webp (id unike edhe brenda të njëjtës milisekondë)
   (Shërbehet nga `src/app/api/uploads/[file]/route.ts` përmes rewrite `/uploads/:file` në `next.config.mjs`, sepse `next start` nuk shërben skedarë të shtuar pas nisjes. Test: `tests/uploads-serve.test.ts`.)
```

**Performanca**: Fotografitë nga aparate moderne (4-5 MB) kompresohen rregullisht në **nën 500 KB** (reduktim **85-90%** i hapësirës) duke ruajtur cilësi vizuale të shkëlqyer për ekspozim në galeri dhe në faqet e librit 3D.

### 2.3 Raporti Automatik i Pamjes (Aspect Ratio)

Sistemi llogarit automatikisht raportin e përshtatshëm nga dimensionet e nxjerra nga Sharp metadata:

| Raporti | Kushti i Dimensionit | Përdorimi në Dizajn |
|---|---|---|
| `16:9` | `width / height > 1.5` | Pamje panoramike dhe video |
| `4:3` | `1.1 < width / height ≤ 1.5` | Standardi fotografik klasik |
| `3:4` | `width / height < 0.85` | Portrete vertikale arkivore |
| `1:1` | `0.85 ≤ width / height ≤ 1.1` | Katrore / detaje të ngushta |

---

## 3. Suita e Testeve Automatikë (R4)

Suita përfshin **67 teste** të shpërndara në 6 skedarë me arkitekturë me 4 nivele (Tier 1–4):

| Skedari i Testit | Teste | Nivelet (Tiers) | Fushat e Mbuluara |
|---|---|---|---|
| `tests/admin-auth.test.ts` | 16 | Boundary | AUDIT-2026-11-15: 401/403 pa token në të gjitha endpoint-et e shkrimit + backup/restore, 200 me token, GET-et publike mbeten të hapura |
| `tests/backup-restore.test.ts` | 16 | Tier 1–4 | Backup CLI, Restore CLI, API download/restore, manifest SHA-256, korruptime, version locking, atomic rollback, disaster recovery 100% |
| `tests/upload.test.ts` | 15 | Tier 1–4 | Kufiri ekzakt 5,242,880B (HTTP 200), refuzimi 5,242,881B (HTTP 413), refuzimi i skedarëve të dëmtuar (HTTP 400), kompresimi Sharp WebP q82 me reduktim ≥60%, ruajtja në disk |
| `tests/security.test.ts` | 13 | Tier 1–4 | SEC-01 guard te `/api/cms/reset` (401 pa token, 403 me token të gabuar, konfirmim prodhimi), SEC-02 guard te `/api/users`, validimi i fjalëkalimit/emailit, mbrojtja nga ndryshimet e paautorizuara |
| `tests/api.test.ts` | 4 | Unit | Integriteti i gjendjes atomike JSON, `getCmsState`, `saveCmsState`, krijimi/fshirja e rrëfimeve, sekuencialiteti i faqeve të librit |
| `tests/book.test.ts` | 3 | Unit | Validimi i fletëve dyshe (spreads), dekompozimi i folios për ekranet celularë, kufijtë e navigimit |

**Izolimi:** `npm test` ngarkon `tests/test-env.ts` (`--import`), që krijon dosje të përkohshme dhe vendos `ARKIVI_DATA_ROOT` + `DATABASE_URI`; testet nuk prekin kurrë `data/` ose `public/uploads` reale.

**Ekzekutimi i plotë i testeve:**
```powershell
npm test
```
*Ekzekutohet sekuencialisht me `--test-concurrency=1 --test-force-exit` duke garantuar izolim transaksional dhe 100% sukses.*

---

## 4. Statusi i Prodhimit

| Funksionaliteti | Statusi | Shënime |
|---|---|---|
| ✅ **SEC-01 Guard** (`/api/cms/reset`) | Implementuar & Testuar | Kërkon Bearer secret / x-admin-token, mbrojtje prodhimi |
| ✅ **SEC-02 Guard** (`/api/users`) | Implementuar & Testuar | Parandalon regjistrimin e paautorizuar dhe enumerimin |
| ✅ **SYS-01 Absolute Paths** (`getAppRoot`) | Implementuar & Testuar | Eliminon paqartësitë e `process.cwd()` |
| ✅ **Backup CLI** (`npm run backup`) | Implementuar & Testuar | Krijon ZIP portabël me manifest SHA-256 |
| ✅ **Restore CLI** (`npm run restore`) | Implementuar & Testuar | Rivendosje atomike me kontroll SHA-256 dhe rollback |
| ✅ **API GET `/api/backup`** | Implementuar & Testuar | Kërkon token; shkarkim i transmetuar ZIP me headers përkatëse |
| ✅ **API POST `/api/restore`** | Implementuar & Testuar | Kërkon token; pranim multipart dhe restaurim i plotë me kufi 200MB |
| ✅ **Admin Web UI Panel** | Implementuar & Testuar | Skeda 6 në Studio e Autorit me `BackupManager.tsx` |
| ✅ **Kufiri Server-Side ≤ 5MB** | Implementuar & Testuar | HTTP 413 në `api/media` dhe `beforeValidate` në Payload |
| ✅ **Kompresimi Sharp WebP** | Implementuar & Testuar | Cilësi 82, max 2560px, reduktim ~85-90% i madhësisë |
| ✅ **Client Pre-Flight Check** | Implementuar & Testuar | Bllokim në `MediaLibrary.tsx` me Sonner toast në shqip |
| ✅ **Suita e Testeve Automatikë** | Implementuar & Testuar | 67 teste, 6 suita, 100% kaluese |
| ✅ **TypeScript Linting** | Verifikuar | `tsc --noEmit` me 0 gabime |
