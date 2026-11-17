# AGENTS.md — Protokolli i Bashkëpunimit me AI

Ky skedar përmban rregullat operative për çdo agjent AI që punon në këtë repository.

---

## 1. Parimet e Veprimit (FORGE)

- **Outcome First**: Para çdo ndryshimi, kuptoni saktësisht çfarë kërkohet.
- **Rregulli i Artë i Kontekstit**: Mos lexoni të gjithë projektin me sy të verbër! Përdorni [context.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/context.md) si task router dhe lexoni vetëm skedarin specifik nga `docs/context/`.
- **Fakte, jo Ditare**: Kur shkruani ose përditësoni dokumentacion, shënoni çfarë është e vërtetë dhe ku ndodhet kodi, jo historikun e veprimeve të kaluara.
- **Verifikim i Detyrueshëm**: Asnjë detyrë nuk quhet e përfunduar pa ekzekutuar `npm run lint` (duhet 0 gabime) dhe pa verifikuar vizualisht funksionimin në shfletues.

---

## 2. Rregullat e Mjedisit Windows

- Komandat e terminalit duhet të jenë gjithmonë në sintaksën e **PowerShell**:
  - Përdorni `;` ose rreshta të veçantë (jo `&&`).
  - Shtigjet e skedarëve në komandat vendase përdorin backslashes `\`.
  - Mos përdorni thonjëza të vetme `'` me variabla mjedisi.

---

## 3. Rosteri i Roleve

| Roli | Përgjegjësia | Lexon Fillimisht | Nuk Prek |
|---|---|---|---|
| **Frontend & UI Specialist** | Stilet arkivore, shfletuesi i librit 3D, komponentët publikë | `docs/context/04-design-system-and-tokens.md` | Logjikën e DB dhe autentifikimit |
| **Studio & Admin Specialist** | Studio e Autorit, Drag & Drop, formularet shqip | `docs/context/02-studio-e-autorit.md` | Fizikën 3D të librit publik |
| **Payload & Backend Specialist** | Payload v3 skemat, API endpoints, SQLite | `docs/context/05-database-and-collections.md` | Stilet vizuale dhe CSS |
| **Book Physics Specialist** | Rrotullimi 3D, koordinimi atomik i fletëve, `@react-spring/web` | `docs/context/03-3d-book-physics.md` | Koleksionet e tjera të CMS |
