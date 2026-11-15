# BARDHI Workspace — Udhërrëfyesi Qendror i Kontekstit

Mirë se vini në hapësirën e punës **BARDHI**. Ky dokument shërben si porta hyrëse për të gjithë agjentët AI dhe inxhinierët softuerikë, duke ofruar qartësi të menjëhershme për arkitekturën, mjetet operacionale dhe rregullat e projektit.

---

## 1. Struktura e Dosjeve të Hapësirës së Punës

Hapësira përmban dy mjedise kryesore:

1. **`arkivi-app/`** (Aplikacioni Prodhues Aktiv — Qendra e Zhvillimit):
   - **Stack-u Kryesor**: **Next.js 15 (App Router, React 19) + PayloadCMS v3 (3.93.0) + SQLite** (`data/arkivi.db`) me arkitekturë të dyfishtë të dhënash (SQLite për përdorues/auth dhe dokument atomik JSON `data/cms-data.json` për përmbajtjen aktive të CMS-it).
   - **Ndërfaqja Administrative**: **"Studio e Autorit"** (`/studio`) — ndërfaqe me 6 tab-e e dizajnuar posaçërisht në gjuhën shqipe për babanë e moshuar (pa fjalëkalim, pa terma teknikë SaaS). Përfshin skedën e re **"Rezervim & Rivendosje"** (`BackupManager.tsx`).
   - **Paneli Teknik**: **Payload Super Admin** (`/admin`) — i siguruar me kredenciale dhe fjalëkalim për mirëmbajtje teknike.
   - **Frontend Publik & Libri Fizik 3D** (`/`) — përvojë me rrotullim realist fletësh (`@react-spring/web` + Framer Motion) dhe tipografi arkivore anti-slop (60-30-10).
   - **Sistemi i Rezervimit & Rivendosjes (R2)**: Kopje rezervë portabël me zero humbje të dhënash (`npm run backup`, `npm run restore <file>`, `/api/backup`, `/api/restore`).
   - **Optimizimi i Imazheve (R3)**: Kufi i rreptë server-side ≤ 5MB dhe kompresim i lartë Sharp WebP (quality 82, auto-orientation, max 2560px) me reduktim ~85-90% të hapësirës në disk.
   - **Siguria e Prodhimit (R1)**: Endpoint-e të mbrojtura me sekret administrativ (`/api/cms/reset` me SEC-01, `/api/users` me SEC-02), dhe zgjidhje absolute e rrugëve (`SYS-01` me `getAppRoot()`).
   - **Suita e Testimit Automatik (R4)**: Testim i plotë me 4 nivele (Tier 1–4) i ekzekutuar përmes `npm test`.

2. **`në-kujtim-të-dritan-berishës/`** (Mockup-i dhe Prototipi Fillestar):
   - Prototip historik fillestar në Express + Vite + React 19.
   - Përmban specifikimet e hershme të dizajnit në [DESIGN.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/në-kujtim-të-dritan-berishës/DESIGN.md). Nuk përdoret për prodhim.

---

## 2. Task Router i Shpejtë për Agjentët AI

Para se të nisni çdo detyrë, lexoni dokumentin e specializuar përkatës:

| Fusha / Detyra | Çfarë Mbulon | Lexoni Fillimisht |
|---|---|---|
| **Arkitektura & Serveri** | Next.js 15, PayloadCMS v3, SQLite, rrugët absolute `getAppRoot()`, konfigurimi i build-it | [arkivi-app/docs/context/01-architecture-and-stack.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/01-architecture-and-stack.md) |
| **Studio e Autorit** | GUI me 6 tab-e, editori i librit, menaxhimi i rrëfimeve, albumi, paneli i rezervimit | [arkivi-app/docs/context/02-studio-e-autorit.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/02-studio-e-autorit.md) |
| **Fizika e Librit 3D** | Rrotullimi 3D i faqeve, koordinimi atomik `ReaderNavState`, shtresat Z (`translateZ`) | [arkivi-app/docs/context/03-3d-book-physics.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/03-3d-book-physics.md) |
| **Dizajni & Tipografia** | Sistemi i ngjyrave 60-30-10, rregullat anti-slop, drop-caps, fontet Playfair/Inter/Lora | [arkivi-app/docs/context/04-design-system-and-tokens.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/04-design-system-and-tokens.md) |
| **Baza e të Dhënave & Skemat** | Koleksionet Payload, skemat SQLite, hook-u `beforeValidate` te Media, JSON atomik | [arkivi-app/docs/context/05-database-and-collections.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/05-database-and-collections.md) |
| **Qasja & Siguria** | Autori pa pass vs superadmini teknik, SEC-01 (`/api/cms/reset`), SEC-02 (`/api/users`) | [arkivi-app/docs/context/06-auth-and-permissions.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/06-auth-and-permissions.md) |
| **Rezervimi, Rivendosja & Fotot** | Backup/restore CLI & Web UI me SHA-256 dhe rollback, kufiri ≤ 5MB dhe kompresimi Sharp | [arkivi-app/docs/context/07-backup-restore-and-uploads.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/07-backup-restore-and-uploads.md) |
| **Harta e të Gjithë Skedarëve** | Indeksi i plotë i dosjeve, skriptet, komponentët dhe testet e kataloguara | [arkivi-app/PROJECT_INDEX.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/PROJECT_INDEX.md) |

---

## 3. Komandat Kryesore Operacionale

Të gjitha komandat ekzekutohen brenda dosjes `arkivi-app`:

```powershell
cd c:\Users\EDEMNUSHIW\Desktop\BARDHI\arkivi-app

# 1. Ekzekutimi i plotë i suitës së testeve (51 teste në Tiers 1-4)
npm test

# 2. Krijimi i kopjes rezervë (ZIP portabël në backups/ me manifest SHA-256)
npm run backup

# 3. Rivendosja atomike nga një kopje rezervë me verifikim checksums
npm run restore -- backups\backup-YYYY-MM-DDTHH-MM-SS.zip

# 4. Verifikimi i tipizimit Typescript (duhet të dalë 0 gabime)
npm run lint

# 5. Kompilimi i prodhimit Next.js + PayloadCMS
npm run build

# 6. Nisja e serverit lokal të zhvillimit (porti 3001)
npm run dev
```
