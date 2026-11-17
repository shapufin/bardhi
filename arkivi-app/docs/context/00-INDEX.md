# Inventari i Dokumenteve të Kontekstit (`docs/context/`)

Ky dosier përmban dokumentacionin e thelluar dhe të izoluar për çdo fushë të aplikacionit. Çdo skedar mbulon një fushë të posaçme me parimet e pandryshueshme (invariants), vendndodhjen e kodit, rregullat se çfarë nuk duhet të bëhet, dhe mënyrën e pavarur të verifikimit.

| Skedari | Përmbajtja Kryesore |
|---|---|
| [01-architecture-and-stack.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/01-architecture-and-stack.md) | Next.js 15 App Router, integrimi i PayloadCMS v3, dual-persistence (SQLite + JSON), rrugët absolute `getAppRoot()` (SYS-01) |
| [02-studio-e-autorit.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/02-studio-e-autorit.md) | Studio e Autorit: struktura me 7 tab-e (përfshirë Kronologjia dhe Rezervim & Rivendosje), Drag & Drop, pre-flight check për fotot ≤5MB |
| [03-3d-book-physics.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/03-3d-book-physics.md) | Fizika e Librit 3D me `@react-spring/web`, shtresat Z (`translateZ`), koordinimi atomik `ReaderNavState` |
| [04-design-system-and-tokens.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/04-design-system-and-tokens.md) | Sistemi i ngjyrave 60-30-10, tipografia 2+1, drop-cap, rregullat strikte anti-slop |
| [05-database-and-collections.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/05-database-and-collections.md) | Skemat e plota të koleksioneve dhe globaleve në PayloadCMS v3, hook-u `beforeValidate` te Media, gjendja atomike JSON |
| [06-auth-and-permissions.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/06-auth-and-permissions.md) | Modeli i qasjes: autori me fjalëkalim Studio vs superadmini teknik, mbrojtja SEC-01 (`/api/cms/reset`) dhe SEC-02 (`/api/users`) |
| [07-backup-restore-and-uploads.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/07-backup-restore-and-uploads.md) | Sistemi i rezervimit/rivendosjes me zero humbje (CLI & Web UI) + kufijtë ≤ 5MB dhe kompresimi Sharp WebP |
| [08-docker-production-deployment.md](file:///c:/Users/EDEMNUSHIW/Desktop/BARDHI/arkivi-app/docs/context/08-docker-production-deployment.md) | Udhëzuesi i vendosjes në prodhim me Docker & Docker Compose (Superuser, Volumes, Seeding) |
