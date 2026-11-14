# Context & Task Router — Arkivi Përkujtimor Dritan Berisha

> **Udhërrëfyesi Qendror për Mirëmbajtjen e Aplikacionit nga Agjentët AI dhe Zhvilluesit**
> Lexoni këtë dokument para çdo modifikimi në kod. Ky dokument lidh të gjitha modulet dhe parimet e arkitekturës në mënyrë që të mos jetë e nevojshme ri-skanimi i të gjithë aplikacionit.

---

## 1. Identiteti i Projektit & Stack-u Teknik

- **Qëllimi**: Arkiv përkujtimor dinjitoz dhe libër 3D fizik për Dritan Berishën (1998–2024), i shkruar dhe i menaxhuar nga babai i tij i moshuar (Ilir Berisha).
- **Frontend Publik**: Next.js 15 (App Router, React 19) + Tailwind CSS v4 + Framer Motion + `@react-spring/web` për fizikën e librit 3D.
- **CMS & Backend**: PayloadCMS v3 (`payload: ^3.93.0`) i integruar natively në Next.js App Router (`src/payload.config.ts`).
- **Baza e të Dhënave**: SQLite lokalisht (`@payloadcms/db-sqlite`, `data/arkivi.db`) me gati-për-prodhim në Docker PostgreSQL (`@payloadcms/db-postgres`).
- **Studio Administrative**: Ndërfaqe e dedikuar në shqip **"Studio e Autorit"** (`/studio`), pa fjalëkalim për autorin e moshuar. Payload Super Admin (`/admin`) mbetet vetëm për mirëmbajtje teknike nga superuser-i.

---

## 2. Task Router (Ku të Lexoni Para se të Punoni)

Kur merrni një detyrë, gjeni fjalën kyçe këtu dhe lexoni **vetëm skedarin përkatës të kontekstit** para se të modifikoni kodin:

| Fusha / Detyra | Fjalët Kyçe | Lexoni Fillimisht |
|---|---|---|
| **Arkitektura & Serveri** | Next.js, PayloadCMS, build, dev, routing, deploy | [docs/context/01-architecture-and-stack.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/01-architecture-and-stack.md) |
| **Studio e Autorit** | GUI, admin, editor, drag-drop, rrefimet, tab-et | [docs/context/02-studio-e-autorit.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/02-studio-e-autorit.md) |
| **Libri 3D Fizik** | Libri, rrotullim fletesh, 3D, react-spring, edit inline | [docs/context/03-3d-book-physics.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/03-3d-book-physics.md) |
| **Dizajni & Tipografia** | Ngjyrat, 60-30-10, fontet, drop-cap, stili arkivor | [docs/context/04-design-system-and-tokens.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/04-design-system-and-tokens.md) |
| **Baza e të Dhënave & Skemat** | Koleksione, Stories, BookSpreads, Media, Globals | [docs/context/05-database-and-collections.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/05-database-and-collections.md) |
| **Qasja & Siguria** | Autentifikim, superadmin, fjalekalimi, autor-pa-pass | [docs/context/06-auth-and-permissions.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/06-auth-and-permissions.md) |
| **Harta e të Gjithë Skedarëve** | Folderat, skedaret e projektit, struktura e plote | [PROJECT_INDEX.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/PROJECT_INDEX.md) |

---

## 3. Rregullat e Hekurta (Hot Invariants — Mos i Shkelni Kurrë)

1. **Gjuha Shqipe në Çdo Tekst Përdoruesi**: E gjithë ndërfaqja (si publike ashtu edhe administrative) flet gjuhën shqipe me fjalë të thjeshta e të ngrohta. Mos fusni terma teknikë SaaS (si "Dashboard", "Slug", "Payload Settings", "Endpoints") në sytë e autorit.
2. **Qasja e Autorit Pa Fjalëkalim**: Autori nuk duhet të përballet kurrë me kërkesë fjalëkalimi, 2FA apo format të ndërlikuar hyrjeje kur hyn te `/studio` ose kur klikon butonin në krye të faqes. Paneli `/admin` i siguruar me fjalëkalim është rreptësisht për superuser-in teknik.
3. **Disiplina e Paletës 60-30-10**:
   - `60%`: Letër Muzeale `#F7F4EC` / Kartë `#FCFBF7`
   - `30%`: Gëlqeror i ngrohtë `#EDE8DC`, vija `1px` `#DCD6C8`, bojë qymyri `#171614`
   - `10%`: Theks Qiparisi i Thellë `#1B3B2B`
   - Mos përdorni kurrë gradientë lejla/blu SaaS, karta me hije të rënda ose pilula dekorative.
4. **Fizika e Librit 3D**: Mbani të paprekur strukturën e shtresave `translateZ` dhe koordinimin atomik të gjendjes (`ReaderNavState`) në mënyrë që fletët 3D të mos priten dhe të mos kenë dridhje gjatë kthimit.
5. **Pajtueshmëria e Rrugëve API**: Endpoints ekzistues (`/api/cms`, `/api/site`, `/api/hero`, `/api/layout`, `/api/stories`, `/api/book/spreads`, `/api/media`, `/api/timeline`) duhet të ruajnë strukturën e të dhënave të deklaruar në `src/types/cms.ts`.

---

## 4. Komandat Kryesore

```powershell
# Nisja e serverit lokal te zhvillimit ne portin 3001
cd C:\Users\EDEMNUSHIW\Desktop\BARDHI\arkivi-app
bun run dev

# Verifikimi i tipizimit Typescript (duhet te dale gjithmone 0 gabime)
bun run lint

# Kompilimi i prodhimit Next.js + PayloadCMS
bun run build

# Nisja e prodhimit
bun run start

# Ri-gjenerimi i Import Map per PayloadCMS nese ndryshoni komponente admin
bun run payload generate:importmap
```
